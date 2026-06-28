-- Profile avatars use Supabase Storage with public reads and owner-scoped writes.
-- Files are stored under avatars/{auth.uid()}/* so policies can enforce ownership
-- without trusting user-editable profile metadata.

alter table public.pace_profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "pace avatars public read" on storage.objects;
drop policy if exists "pace avatars owner insert" on storage.objects;
drop policy if exists "pace avatars owner update" on storage.objects;
drop policy if exists "pace avatars owner delete" on storage.objects;

create policy "pace avatars public read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'avatars');

create policy "pace avatars owner insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "pace avatars owner update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (select auth.uid())::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "pace avatars owner delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

grant update (avatar_url) on public.pace_profiles to authenticated;
