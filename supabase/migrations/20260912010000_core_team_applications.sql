-- Private applications. Profile publication and recruiting are independent.
begin;
create table public.core_team_applications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  round text not null default 'first-core-team-2026' check (round = 'first-core-team-2026'),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  revision integer not null default 0 check (revision >= 0),
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  profile_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique(member_id, round),
  check ((status = 'draft' and submitted_at is null and profile_snapshot is null) or
         (status = 'submitted' and submitted_at is not null and profile_snapshot is not null))
);
alter table public.core_team_applications enable row level security;
revoke all on public.core_team_applications from anon, authenticated;
grant select on public.core_team_applications to authenticated;
grant all on public.core_team_applications to service_role;
create policy core_team_read on public.core_team_applications for select to authenticated using (
  exists(select 1 from public.members m where m.id = core_team_applications.member_id and m.auth_user_id = auth.uid())
  or (status = 'submitted' and exists(select 1 from public.members m where m.auth_user_id = auth.uid() and m.is_admin))
);
-- All writes pass through this function: ownership, validation, optimistic concurrency,
-- and the submitted snapshot cannot be bypassed through the REST table endpoint.
create function public.save_core_team_application(draft_answers jsonb, expected_revision integer, submit_application boolean default false)
returns public.core_team_applications language plpgsql security definer set search_path = public, pg_temp as $$
declare
  m public.members;
  a public.core_team_applications;
  k text;
  max_length integer;
  snapshot jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into m from public.members where auth_user_id = auth.uid() for update;
  if not found then raise exception 'Complete account setup' using errcode = '23514'; end if;
  if expected_revision is null or expected_revision < 0 or submit_application is null then raise exception 'Invalid version' using errcode = '23514'; end if;
  if jsonb_typeof(draft_answers) is distinct from 'object' then raise exception 'Invalid answers' using errcode = '23514'; end if;
  if (select count(*) from jsonb_object_keys(draft_answers)) <> 5 then raise exception 'Invalid answers' using errcode = '23514'; end if;
  foreach k in array array['community','interests','proud_of','work_link','availability'] loop
    max_length := case k when 'community' then 6000 when 'interests' then 4000 when 'proud_of' then 8000 else 2000 end;
    if jsonb_typeof(draft_answers->k) is distinct from 'string' or length(draft_answers->>k) > max_length then
      raise exception 'Invalid answer length or type' using errcode = '23514';
    end if;
  end loop;
  insert into public.core_team_applications(member_id) values(m.id) on conflict(member_id,round) do nothing;
  select * into a from public.core_team_applications where member_id = m.id and round = 'first-core-team-2026' for update;
  -- Safe retry after a response was lost; never overwrite another tab's newer answers.
  if a.answers = draft_answers and (not submit_application or a.status = 'submitted') then return a; end if;
  if a.status <> 'draft' then raise exception 'Application already submitted' using errcode = '55000'; end if;
  if a.revision <> expected_revision then raise exception 'Application changed in another tab' using errcode = '40001'; end if;
  if submit_application then
    if not coalesce(m.onboarding_completed,false) or
      nullif(btrim(m.first_name),'') is null or nullif(btrim(m.last_name),'') is null or
      nullif(btrim(m.slug),'') is null or nullif(btrim(m.school),'') is null or
      nullif(btrim(m.program),'') is null or nullif(btrim(m.graduating_class),'') is null or
      nullif(btrim(m.profile_image_url),'') is null or nullif(btrim(m.bio),'') is null or
      coalesce(cardinality(m.specialties),0) = 0 then
      raise exception 'Complete your profile before submitting' using errcode = '23514';
    end if;
    if nullif(btrim(draft_answers->>'community'),'') is null or nullif(btrim(draft_answers->>'interests'),'') is null or nullif(btrim(draft_answers->>'proud_of'),'') is null then
      raise exception 'Answer all required questions' using errcode = '23514';
    end if;
    if btrim(draft_answers->>'work_link') <> '' and btrim(draft_answers->>'work_link') !~ '^https?://[^[:space:]@/]+([/?#][^[:space:]]*)?$' then
      raise exception 'Invalid project link' using errcode = '23514';
    end if;
    snapshot := jsonb_build_object('first_name',m.first_name,'last_name',m.last_name,'slug',m.slug,
      'school',m.school,'program',m.program,'graduating_class',m.graduating_class,'bio',m.bio,
      'profile_image_url',m.profile_image_url,'specialties',m.specialties,'work_schedule',m.work_schedule,
      'portfolio',m.portfolio,'linkedin',m.linkedin,'school_email',m.school_email,
      'experiences',coalesce((select jsonb_agg(to_jsonb(e)-'member_id') from public.member_experiences e where e.member_id=m.id),'[]'::jsonb),
      'leadership',coalesce((select jsonb_agg(to_jsonb(l)-'member_id') from public.member_leadership l where l.member_id=m.id),'[]'::jsonb));
  end if;
  update public.core_team_applications set answers = draft_answers, revision = revision + 1, updated_at = now(),
    status = case when submit_application then 'submitted' else 'draft' end,
    submitted_at = case when submit_application then now() else null end,
    profile_snapshot = snapshot where id = a.id returning * into a;
  return a;
end;
$$;
revoke all on function public.save_core_team_application(jsonb,integer,boolean) from public, anon;
grant execute on function public.save_core_team_application(jsonb,integer,boolean) to authenticated;
commit;
