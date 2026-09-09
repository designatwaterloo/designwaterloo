alter table public.member_experiences
  add column if not exists end_month text,
  add column if not exists end_year text,
  add column if not exists description text,
  add column if not exists location text,
  add column if not exists employment_type text;

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
  insert into public.member_experiences(member_id,position_title,company,start_month,start_year,is_current,link,end_month,end_year,description,location,employment_type)
    select mid,x.position_title,x.company,x.start_month,x.start_year,coalesce(x.is_current,false),x.link,x.end_month,x.end_year,x.description,x.location,x.employment_type
    from jsonb_to_recordset(experiences) as x(position_title text,company text,start_month text,start_year text,is_current boolean,link text,end_month text,end_year text,description text,location text,employment_type text);
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

create or replace function public.save_my_experiences(experiences jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare mid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode='42501'; end if;
  select id into mid from public.members where auth_user_id=auth.uid() and review_status='draft' for update;
  if mid is null then raise exception 'Draft profile not found' using errcode='42501'; end if;
  if jsonb_typeof(experiences) is distinct from 'array' then raise exception 'Invalid positions'; end if;
  if jsonb_array_length(experiences)>50 then raise exception 'Too many positions'; end if;
  if exists(select 1 from jsonb_array_elements(experiences) e where nullif(trim(e->>'company'),'') is null or nullif(trim(e->>'position_title'),'') is null or coalesce(e->>'start_year','') !~ '^\d{4}$') then raise exception 'Incomplete position'; end if;
  delete from public.member_experiences where member_id=mid;
  insert into public.member_experiences(member_id,position_title,company,start_month,start_year,is_current,link,end_month,end_year,description,location,employment_type)
    select mid,x.position_title,x.company,x.start_month,x.start_year,coalesce(x.is_current,false),x.link,x.end_month,x.end_year,x.description,x.location,x.employment_type
    from jsonb_to_recordset(experiences) as x(position_title text,company text,start_month text,start_year text,is_current boolean,link text,end_month text,end_year text,description text,location text,employment_type text);
end; $$;
revoke all on function public.save_my_experiences(jsonb) from public, anon;
grant execute on function public.save_my_experiences(jsonb) to authenticated;
