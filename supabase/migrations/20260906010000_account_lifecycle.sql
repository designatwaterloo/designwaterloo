-- Existing accounts and profile IDs are preserved. These RPCs are additive.
create or replace function public.ensure_member()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  email text;
  full_name text;
  first text;
  last text;
  base text;
  suffix integer := 0;
  row public.members%rowtype;
  candidate uuid;
  candidate_count integer;
  identifiers text[];
begin
  if uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select * into row from public.members where auth_user_id = uid;
  if found then return jsonb_build_object('slug',row.slug,'onboardingCompleted',row.onboarding_completed,'outcome','linked'); end if;
  select lower(u.email), coalesce(u.raw_user_meta_data->>'full_name','') into email, full_name
    from auth.users u where u.id=uid and u.email_confirmed_at is not null;
  if email is null or email !~ '^[^@]+@(uwaterloo\.ca|mylaurier\.ca)$' then
    raise exception 'Use a verified university email address' using errcode='42501';
  end if;
  identifiers := array[email];
  -- Provider identity data is server-maintained. Never trust editable user_metadata for account ownership.
  select identifiers || coalesce(array_agg(lower(i.identity_data->>'preferred_username')) filter (
    where lower(i.identity_data->>'preferred_username') ~ '^[^@]+@uwaterloo\.ca$'), '{}'::text[])
    into identifiers from auth.identities i where i.user_id=uid and i.provider='azure';
  select count(*) into candidate_count from public.members m where lower(m.school_email)=any(identifiers);
  if candidate_count > 1 then raise exception 'Multiple profiles match this account. Please contact Design Waterloo.'; end if;
  select m.id into candidate from public.members m where lower(m.school_email)=any(identifiers) for update;
  if found then
    update public.members set auth_user_id=uid where id=candidate and auth_user_id is null returning * into row;
    if not found then raise exception 'This profile is linked to another account. Please contact Design Waterloo.'; end if;
    return jsonb_build_object('slug',row.slug,'onboardingCompleted',row.onboarding_completed,'outcome','linked');
  end if;
  first := split_part(trim(full_name),' ',1);
  last := trim(substr(trim(full_name),length(first)+1));
  base := trim(both '-' from regexp_replace(lower(coalesce(nullif(full_name,''),split_part(email,'@',1))), '[^a-z0-9]+','-','g'));
  if base='' then base:='member'; end if;
  loop
    begin
      insert into public.members(auth_user_id,first_name,last_name,slug,school_email,school,onboarding_completed,is_approved,is_admin,review_status)
        values(uid,first,last,base || case when suffix=0 then '' else '-'||suffix end,email,
          case when email like '%@uwaterloo.ca' then 'University of Waterloo' else 'Wilfrid Laurier University' end,false,false,false,'draft') returning * into row;
      exit;
    exception when unique_violation then
      select * into row from public.members where auth_user_id=uid;
      if found then exit; end if;
      suffix:=suffix+1;
      if suffix>100 then raise exception 'Could not allocate a profile URL. Please retry.'; end if;
    end;
  end loop;
  return jsonb_build_object('slug',row.slug,'onboardingCompleted',row.onboarding_completed,'outcome','created');
end;
$$;
revoke all on function public.ensure_member() from public, anon;
grant execute on function public.ensure_member() to authenticated;

-- All fields and child collections save in a single transaction. A failed insert rolls back deletes.
create or replace function public.save_my_profile(profile jsonb, experiences jsonb, leadership jsonb, submit boolean default false)
returns void language plpgsql security invoker set search_path = '' as $$
declare mid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode='42501'; end if;
  select id into mid from public.members where auth_user_id=auth.uid() for update;
  if mid is null then raise exception 'Profile not found' using errcode='42501'; end if;
  if jsonb_typeof(profile) is distinct from 'object' or jsonb_typeof(experiences) is distinct from 'array' or jsonb_typeof(leadership) is distinct from 'array' then
    raise exception 'Invalid profile payload';
  end if;
  update public.members set
    program=profile->>'program', graduating_class=profile->>'graduating_class',bio=profile->>'bio',public_email=profile->>'public_email',
    specialties=array(select jsonb_array_elements_text(profile->'specialties')),
    work_schedule=array(select jsonb_array_elements_text(profile->'work_schedule')),
    profile_image_url=profile->>'profile_image_url',linkedin=profile->>'linkedin',portfolio=profile->>'portfolio',
    instagram=profile->>'instagram',twitter=profile->>'twitter',github=profile->>'github',behance=profile->>'behance',dribbble=profile->>'dribbble'
    where id=mid;
  delete from public.member_experiences where member_id=mid;
  insert into public.member_experiences(member_id,position_title,company,start_month,start_year,is_current,link)
    select mid,x.position_title,x.company,x.start_month,x.start_year,coalesce(x.is_current,false),x.link
    from jsonb_to_recordset(experiences) as x(position_title text,company text,start_month text,start_year text,is_current boolean,link text);
  delete from public.member_leadership where member_id=mid;
  insert into public.member_leadership(member_id,position_title,organization,start_month,start_year,is_current,link)
    select mid,x.position_title,x.organization,x.start_month,x.start_year,coalesce(x.is_current,false),x.link
    from jsonb_to_recordset(leadership) as x(position_title text,organization text,start_month text,start_year text,is_current boolean,link text);
  if submit then
    update public.members set review_status='pending_review',submitted_at=now(),is_approved=false where id=mid;
  end if;
end;
$$;
revoke all on function public.save_my_profile(jsonb,jsonb,jsonb,boolean) from public, anon;
grant execute on function public.save_my_profile(jsonb,jsonb,jsonb,boolean) to authenticated;

-- Protect inserts as well as updates; service-role admin routes retain their intended access.
create or replace function public.prevent_privilege_escalation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user = 'postgres' or auth.role() = 'service_role' then return new; end if;
  if exists(select 1 from public.members where auth_user_id=auth.uid() and is_admin) then return new; end if;
  if tg_op='INSERT' then
    new.is_admin:=false; new.is_approved:=false; new.review_status:='draft';
  else
    new.is_admin:=old.is_admin;
    new.is_approved:=old.is_approved;
    if new.review_status='pending_review' then new.is_approved:=false;
    elsif new.review_status is distinct from old.review_status then new.review_status:=old.review_status;
    end if;
    if old.auth_user_id is not null and new.auth_user_id is distinct from old.auth_user_id then
      raise exception 'Account ownership cannot be changed' using errcode='42501';
    end if;
    if new.school_email is distinct from old.school_email then
      raise exception 'University email cannot be changed here' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists members_prevent_escalation on public.members;
create trigger members_prevent_escalation before insert or update on public.members
  for each row execute function public.prevent_privilege_escalation();
