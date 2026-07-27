-- v0.39: allow admins to view/update profiles for Users / Roles cloud tab.
-- Existing profile owner SELECT policy remains in place.
begin;

drop policy if exists "admin read profiles" on public.profiles;
create policy "admin read profiles"
on public.profiles for select
to authenticated
using (public.can_verify_library());

drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles"
on public.profiles for update
to authenticated
using (public.can_verify_library())
with check (role in ('viewer','editor','reviewer','admin'));

commit;
