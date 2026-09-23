begin;
-- Resolve authorization from live, server-owned data so revocation does not wait
-- for an old JWT to expire. Never consult user-editable metadata.
create or replace function public.current_staff_role()
returns text language sql stable security definer set search_path = '' as $$
 select case
  when exists(select 1 from public.members m where m.auth_user_id=auth.uid() and m.is_admin) then 'superadmin'
  when exists(select 1 from auth.users u where u.id=auth.uid() and u.raw_app_meta_data->>'design_waterloo_role'='admin')
   and exists(select 1 from public.members m where m.auth_user_id=auth.uid()) then 'admin'
  else 'member' end;
$$;
create or replace function public.can_read_member(target_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.members m where m.id=target_id and (
  (m.is_approved and m.onboarding_completed and m.review_status='approved' and m.school_email not like '%@test.designwaterloo.local')
  or m.auth_user_id=auth.uid()
  or public.current_staff_role()='superadmin'
  or (public.current_staff_role()='admin' and m.review_status='pending_review')
 ));
$$;
revoke all on function public.current_staff_role(), public.can_read_member(uuid) from public;
grant execute on function public.current_staff_role(), public.can_read_member(uuid) to anon, authenticated, service_role;

-- Restrictive gates also constrain older permissive policies still in the live DB.
alter table public.members enable row level security;
create policy member_read_access on public.members for select to anon,authenticated using(public.can_read_member(id));
create policy member_read_boundary on public.members as restrictive for select to anon,authenticated using(public.can_read_member(id));
alter table public.member_experiences enable row level security;
create policy experience_read_access on public.member_experiences for select to anon,authenticated using(public.can_read_member(member_id));
create policy experience_read_boundary on public.member_experiences as restrictive for select to anon,authenticated using(public.can_read_member(member_id));
alter table public.member_leadership enable row level security;
create policy leadership_read_access on public.member_leadership for select to anon,authenticated using(public.can_read_member(member_id));
create policy leadership_read_boundary on public.member_leadership as restrictive for select to anon,authenticated using(public.can_read_member(member_id));
alter table public.works enable row level security;
create policy reviewer_work_read on public.works for select to authenticated using(public.current_staff_role()='admin' and exists(select 1 from public.members m where m.id=works.member_id and m.review_status='pending_review'));
create policy work_read_boundary on public.works as restrictive for select to anon,authenticated using(public.can_read_member(member_id));

-- Review admins never gain direct writes to another person's records.
create policy member_update_boundary on public.members as restrictive for update to authenticated
 using(auth_user_id=auth.uid() or public.current_staff_role()='superadmin')
 with check(auth_user_id=auth.uid() or public.current_staff_role()='superadmin');
create policy member_delete_boundary on public.members as restrictive for delete to authenticated using(public.current_staff_role()='superadmin');
create policy member_insert_boundary on public.members as restrictive for insert to authenticated with check(auth_user_id=auth.uid() or public.current_staff_role()='superadmin');

create or replace function public.resolve_username(requested_username text)
returns text language sql stable security definer set search_path = '' as $$
 select m.slug from public.username_claims c join public.members m on m.id=c.member_id
 where c.username=lower(btrim(requested_username)) and public.can_read_member(m.id);
$$;
notify pgrst, 'reload schema';
commit;
