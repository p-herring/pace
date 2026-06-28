-- Public-within-Pace user profiles with activity posts and photo uploads.
-- "Completed event" activity is generated when a participant is marked attended.

do $$
begin
  create type public.pace_activity_entry_type as enum ('manual', 'completed_plan');
exception
  when duplicate_object then null;
end $$;

create table public.pace_activity_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.pace_profiles(id) on delete cascade,
  plan_id uuid references public.pace_plans(id) on delete set null,
  entry_type public.pace_activity_entry_type not null default 'manual',
  caption text check (caption is null or char_length(caption) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (entry_type = 'manual' or plan_id is not null)
);

create table public.pace_activity_post_photos (
  id uuid primary key default gen_random_uuid(),
  activity_post_id uuid not null references public.pace_activity_posts(id) on delete cascade,
  photo_url text not null,
  storage_path text not null,
  sort_order smallint not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create unique index pace_activity_completed_unique_idx
  on public.pace_activity_posts (user_id, plan_id, entry_type)
  where entry_type = 'completed_plan' and plan_id is not null;

create index pace_activity_posts_user_created_idx
  on public.pace_activity_posts (user_id, created_at desc);

create index pace_activity_photos_post_order_idx
  on public.pace_activity_post_photos (activity_post_id, sort_order);

create trigger pace_activity_posts_updated
  before update on public.pace_activity_posts
  for each row execute function public.pace_set_updated_at();

alter table public.pace_activity_posts enable row level security;
alter table public.pace_activity_post_photos enable row level security;

grant select, insert on public.pace_activity_posts, public.pace_activity_post_photos to authenticated;
grant update (caption, plan_id) on public.pace_activity_posts to authenticated;
grant delete on public.pace_activity_posts, public.pace_activity_post_photos to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create policy "pace activity posts readable"
on public.pace_activity_posts
for select
to authenticated
using (true);

create policy "pace activity posts author insert"
on public.pace_activity_posts
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and entry_type = 'manual'
);

create policy "pace activity posts author update"
on public.pace_activity_posts
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and entry_type = 'manual'
);

create policy "pace activity posts author delete"
on public.pace_activity_posts
for delete
to authenticated
using (user_id = (select auth.uid()));

create policy "pace activity photos readable"
on public.pace_activity_post_photos
for select
to authenticated
using (
  exists (
    select 1
    from public.pace_activity_posts post
    where post.id = activity_post_id
  )
);

create policy "pace activity photos author insert"
on public.pace_activity_post_photos
for insert
to authenticated
with check (
  exists (
    select 1
    from public.pace_activity_posts post
    where post.id = activity_post_id
      and post.user_id = (select auth.uid())
  )
);

create policy "pace activity photos author delete"
on public.pace_activity_post_photos
for delete
to authenticated
using (
  exists (
    select 1
    from public.pace_activity_posts post
    where post.id = activity_post_id
      and post.user_id = (select auth.uid())
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'activity-photos',
  'activity-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "pace activity photos public read" on storage.objects;
drop policy if exists "pace activity photos owner insert" on storage.objects;
drop policy if exists "pace activity photos owner update" on storage.objects;
drop policy if exists "pace activity photos owner delete" on storage.objects;

create policy "pace activity photos public read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'activity-photos');

create policy "pace activity photos owner insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'activity-photos'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "pace activity photos owner update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'activity-photos'
  and (select auth.uid())::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'activity-photos'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "pace activity photos owner delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'activity-photos'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create or replace function public.pace_create_completed_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'attended' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into public.pace_activity_posts (user_id, plan_id, entry_type, created_at)
    values (new.profile_id, new.plan_id, 'completed_plan', coalesce(new.attended_at, now()))
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists pace_participant_completed_activity on public.pace_plan_participants;
create trigger pace_participant_completed_activity
  after insert or update of status on public.pace_plan_participants
  for each row execute function public.pace_create_completed_activity();

create or replace function public.pace_mark_plan_completed(target_plan uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  target public.pace_plans;
begin
  select * into target
  from public.pace_plans
  where id = target_plan;

  if not found then
    raise exception 'Plan not found';
  end if;

  if target.starts_at > now() then
    raise exception 'You can only complete plans after they start';
  end if;

  update public.pace_plan_participants
  set status = 'attended',
      attended_at = coalesce(attended_at, now()),
      queue_position = null
  where plan_id = target_plan
    and profile_id = auth.uid()
    and status in ('confirmed', 'attended');

  if not found then
    raise exception 'Join this plan before marking it completed';
  end if;
end;
$$;

revoke all on function public.pace_create_completed_activity(), public.pace_mark_plan_completed(uuid) from public;
grant execute on function public.pace_mark_plan_completed(uuid) to authenticated;
