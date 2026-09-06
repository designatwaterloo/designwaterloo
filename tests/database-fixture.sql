create schema auth;
create schema extensions;
create function extensions.uuid_generate_v4() returns uuid language sql as 'select gen_random_uuid()';
create role authenticated;
create role anon;
create role service_role bypassrls;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.email() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.email',true),'') $$;
create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb);
create table auth.identities(user_id uuid,provider text,identity_data jsonb);
create sequence public.members_member_id_seq;
create table public.members("id" uuid default extensions.uuid_generate_v4() not null,
"auth_user_id" uuid,
"member_id" int4 default nextval('members_member_id_seq'::regclass) not null,
"first_name" text not null,
"last_name" text not null,
"slug" text not null,
"profile_image_path" text,
"profile_image_url" text,
"school" text,
"program" text,
"graduating_class" text,
"bio" text,
"public_email" text,
"school_email" text not null,
"instagram" text,
"twitter" text,
"linkedin" text,
"github" text,
"portfolio" text,
"behance" text,
"dribbble" text,
"specialties" text[] default '{}'::text[],
"work_schedule" text[] default '{}'::text[],
"onboarding_completed" bool default false,
"created_at" timestamptz default now(),
"updated_at" timestamptz default now(),
"is_approved" bool default false,
"is_admin" bool default false,
"review_status" text default 'draft'::text not null,
"rejection_feedback" text,
"rejected_at" timestamptz,
"submitted_at" timestamptz,
"slug_confirmed" bool default false not null);
create table public.member_experiences("id" uuid default extensions.uuid_generate_v4() not null,
"member_id" uuid not null,
"position_title" text,
"company" text not null,
"start_month" text,
"start_year" text,
"is_current" bool default false,
"created_at" timestamptz default now(),
"link" text);
create table public.member_leadership("id" uuid default extensions.uuid_generate_v4() not null,
"member_id" uuid not null,
"position_title" text,
"organization" text not null,
"start_month" text,
"start_year" text,
"is_current" bool default false,
"created_at" timestamptz default now(),
"link" text);
create table public.works("id" uuid default extensions.uuid_generate_v4() not null,
"member_id" uuid not null,
"slug" text not null,
"title" text not null,
"description" text,
"year" int4,
"external_url" text,
"cover_image_url" text,
"images" jsonb default '[]'::jsonb not null,
"cover_aspect_ratio" numeric,
"review_status" text default 'draft'::text not null,
"rejection_feedback" text,
"submitted_at" timestamptz,
"approved_at" timestamptz,
"rejected_at" timestamptz,
"published_at" timestamptz,
"created_at" timestamptz default now() not null,
"updated_at" timestamptz default now() not null);
alter table public.works add constraint works_pkey PRIMARY KEY (id);
alter table public.works add constraint works_review_status_check CHECK ((review_status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'approved'::text, 'rejected'::text])));
alter table public.works add constraint works_slug_key UNIQUE (slug);
alter table public.members add constraint members_auth_user_id_key UNIQUE (auth_user_id);
alter table public.members add constraint members_member_id_key UNIQUE (member_id);
alter table public.members add constraint members_pkey PRIMARY KEY (id);
alter table public.members add constraint members_review_status_check CHECK ((review_status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'approved'::text, 'rejected'::text])));
alter table public.members add constraint members_school_check CHECK ((school = ANY (ARRAY['University of Waterloo'::text, 'Wilfrid Laurier University'::text])));
alter table public.members add constraint members_slug_key UNIQUE (slug);
alter table public.member_experiences add constraint member_experiences_pkey PRIMARY KEY (id);
alter table public.member_leadership add constraint member_leadership_pkey PRIMARY KEY (id);
alter table public.works add constraint works_member_id_fkey FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
alter table public.members add constraint members_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.member_experiences add constraint member_experiences_member_id_fkey FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
alter table public.member_leadership add constraint member_leadership_member_id_fkey FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
alter table public.members enable row level security;
alter table public.member_experiences enable row level security;
alter table public.member_leadership enable row level security;
alter table public.works enable row level security;
create policy "Admins can delete any work" on public.works for DELETE to public using ((EXISTS ( SELECT 1
   FROM members
  WHERE ((members.auth_user_id = auth.uid()) AND (members.is_admin = true)))));
create policy "Admins can update any work" on public.works for UPDATE to public using ((EXISTS ( SELECT 1
   FROM members
  WHERE ((members.auth_user_id = auth.uid()) AND (members.is_admin = true)))));
create policy "Admins can view all works" on public.works for SELECT to public using ((EXISTS ( SELECT 1
   FROM members
  WHERE ((members.auth_user_id = auth.uid()) AND (members.is_admin = true)))));
create policy "Approved works are viewable by everyone" on public.works for SELECT to public using ((review_status = 'approved'::text));
create policy "Owners can delete own works" on public.works for DELETE to public using ((member_id IN ( SELECT members.id
   FROM members
  WHERE (members.auth_user_id = auth.uid()))));
create policy "Owners can insert own works" on public.works for INSERT to public with check ((member_id IN ( SELECT members.id
   FROM members
  WHERE (members.auth_user_id = auth.uid()))));
create policy "Owners can update own works" on public.works for UPDATE to public using ((member_id IN ( SELECT members.id
   FROM members
  WHERE (members.auth_user_id = auth.uid()))));
create policy "Owners can view own works" on public.works for SELECT to public using ((member_id IN ( SELECT members.id
   FROM members
  WHERE (members.auth_user_id = auth.uid()))));
create policy "Admins can delete any member" on public.members for DELETE to public using ((EXISTS ( SELECT 1
   FROM members members_1
  WHERE ((members_1.auth_user_id = auth.uid()) AND (members_1.is_admin = true)))));
create policy "Admins can update any member" on public.members for UPDATE to public using ((EXISTS ( SELECT 1
   FROM members members_1
  WHERE ((members_1.auth_user_id = auth.uid()) AND (members_1.is_admin = true)))));
create policy "Members are viewable by everyone" on public.members for SELECT to public using (true);
create policy "Users can insert own profile" on public.members for INSERT to public with check ((auth.uid() = auth_user_id));
create policy "Users can link own migrated profile" on public.members for UPDATE to public using (((lower(school_email) = lower(auth.email())) AND (auth_user_id IS NULL))) with check ((auth_user_id = auth.uid()));
create policy "Users can update own profile" on public.members for UPDATE to public using ((auth.uid() = auth_user_id));
create policy "Experiences are viewable by everyone" on public.member_experiences for SELECT to public using (true);
create policy "Users can manage own experiences" on public.member_experiences for ALL to public using ((member_id IN ( SELECT members.id
   FROM members
  WHERE (members.auth_user_id = auth.uid()))));
create policy "Leadership is viewable by everyone" on public.member_leadership for SELECT to public using (true);
create policy "Users can manage own leadership" on public.member_leadership for ALL to public using ((member_id IN ( SELECT members.id
   FROM members
  WHERE (members.auth_user_id = auth.uid()))));
grant usage on schema public,auth,extensions to authenticated,anon,service_role;
grant all on all tables in schema public to authenticated,service_role;
grant select on all tables in schema public to anon;
grant usage,select on all sequences in schema public to authenticated,service_role;
