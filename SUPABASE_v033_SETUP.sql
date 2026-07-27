-- Anesthculator v0.33 Cloud support
-- Run once in Supabase SQL Editor as project owner.
begin;

-- Create a viewer profile automatically for each newly confirmed/created auth user.
create or replace function public.handle_new_anesth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email,''),'@',1)), 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_anesth on auth.users;
create trigger on_auth_user_created_anesth
after insert on auth.users
for each row execute procedure public.handle_new_anesth_user();

-- Backfill profiles for existing auth users.
insert into public.profiles (id, display_name, role)
select u.id, split_part(coalesce(u.email,''),'@',1), 'viewer'
from auth.users u
on conflict (id) do nothing;

-- Evidence bucket is private. Metadata remains protected by existing RLS.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('reference-files','reference-files',false,20971520,array['application/pdf','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false;

drop policy if exists "anesth evidence read" on storage.objects;
create policy "anesth evidence read" on storage.objects for select to authenticated
using (bucket_id='reference-files');

drop policy if exists "anesth evidence upload" on storage.objects;
create policy "anesth evidence upload" on storage.objects for insert to authenticated
with check (bucket_id='reference-files' and public.can_edit_library());

drop policy if exists "anesth evidence update" on storage.objects;
create policy "anesth evidence update" on storage.objects for update to authenticated
using (bucket_id='reference-files' and public.can_edit_library())
with check (bucket_id='reference-files' and public.can_edit_library());

drop policy if exists "anesth evidence delete" on storage.objects;
create policy "anesth evidence delete" on storage.objects for delete to authenticated
using (bucket_id='reference-files' and public.can_edit_library());

commit;
