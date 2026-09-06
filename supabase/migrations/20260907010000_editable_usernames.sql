-- Preserve public handles independently of the current members.slug.
-- Null owners are tombstones: deleting a member does not release old links.
create table public.username_claims (
  username text primary key check (username = lower(username)),
  member_id uuid references public.members(id) on delete set null deferrable initially deferred,
  created_at timestamptz not null default now()
);
create index username_claims_member_idx on public.username_claims(member_id);
alter table public.username_claims enable row level security;
revoke all on public.username_claims from public, anon, authenticated;
grant all on public.username_claims to service_role;

lock table public.members in share row exclusive mode;
insert into public.username_claims(username, member_id)
select lower(slug), id from public.members;

create function public.valid_username(value text)
returns boolean language sql immutable set search_path = '' as $$
  select value is not null and length(value) between 3 and 40
    and value ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and value <> all(array['admin','api','auth','claim','dashboard','directory',
      'profile','sign-in','sign-out','onboarding','pending-approval','settings',
      'about','member','members','new','edit','work','designwaterloo','support']);
$$;

create function public.reserve_member_username()
returns trigger language plpgsql security definer set search_path = '' as $$
declare claimed text;
begin
  if tg_op = 'UPDATE' and new.slug is not distinct from old.slug then return new; end if;
  new.slug := lower(btrim(new.slug));
  -- Existing handles are grandfathered; owners may return to their old handles.
  if not public.valid_username(new.slug) and not exists (
    select 1 from public.username_claims where username=new.slug and member_id=new.id
  ) then raise exception 'Use 3–40 letters, numbers, or single hyphens; this username may be reserved.' using errcode='22023'; end if;
  insert into public.username_claims(username,member_id) values(new.slug,new.id)
    on conflict (username) do update set username=excluded.username
      where username_claims.member_id=excluded.member_id
    returning username into claimed;
  if claimed is null then raise exception 'That username is already taken or reserved.' using errcode='23505'; end if;
  return new;
end;
$$;
revoke all on function public.reserve_member_username() from public, anon, authenticated;
create trigger members_reserve_username before insert or update of slug on public.members
  for each row execute function public.reserve_member_username();

create function public.username_available(candidate text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    (public.valid_username(lower(btrim(candidate))) and not exists (
      select 1 from public.username_claims where username=lower(btrim(candidate))
    )) or exists (
      select 1 from public.username_claims c join public.members m on m.id=c.member_id
      where c.username=lower(btrim(candidate)) and m.auth_user_id=auth.uid()
    )
  );
$$;
revoke all on function public.username_available(text) from public, anon;
grant execute on function public.username_available(text) to authenticated;

create function public.change_my_username(new_username text, expected_username text)
returns text language plpgsql security invoker set search_path = '' as $$
declare saved text;
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode='42501'; end if;
  update public.members set slug=lower(btrim(new_username)), slug_confirmed=true
    where auth_user_id=auth.uid() and slug=expected_username returning slug into saved;
  if saved is null then raise exception 'Your profile changed. Refresh the page and try again.' using errcode='40001'; end if;
  return saved;
end;
$$;
revoke all on function public.change_my_username(text,text) from public, anon;
grant execute on function public.change_my_username(text,text) to authenticated;

-- Only return the current handle for a profile the caller may view.
create function public.resolve_username(requested_username text)
returns text language sql stable security definer set search_path = '' as $$
  select m.slug from public.username_claims c join public.members m on m.id=c.member_id
  where c.username=lower(requested_username) and (
    (m.is_approved and m.onboarding_completed and m.school_email not like '%@test.designwaterloo.local')
    or m.auth_user_id=auth.uid()
    or exists(select 1 from public.members viewer where viewer.auth_user_id=auth.uid() and viewer.is_admin)
  );
$$;
revoke all on function public.resolve_username(text) from public;
grant execute on function public.resolve_username(text) to anon, authenticated, service_role;

-- Keep automatic account creation compatible with username validation and reservations.
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
  base := coalesce(nullif(trim(both '-' from left(base,32)),''),'person');
  if not public.valid_username(base) then base := 'person-' || base; end if;
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

