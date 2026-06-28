-- Community Q&A board. Posts cascade-delete their replies for v1 so there are
-- no orphaned reply threads after an author removes a post.

create table public.pace_forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.pace_profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 140),
  body text not null check (char_length(trim(body)) between 1 and 5000),
  category text check (category is null or category in ('Training', 'Gear', 'Events', 'General')),
  reply_count integer not null default 0 check (reply_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pace_forum_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.pace_forum_posts(id) on delete cascade,
  author_id uuid not null references public.pace_profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 3000),
  parent_reply_id uuid references public.pace_forum_replies(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pace_forum_post_votes (
  post_id uuid not null references public.pace_forum_posts(id) on delete cascade,
  profile_id uuid not null references public.pace_profiles(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create table public.pace_forum_reply_votes (
  reply_id uuid not null references public.pace_forum_replies(id) on delete cascade,
  profile_id uuid not null references public.pace_profiles(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (reply_id, profile_id)
);

create index pace_forum_posts_created_idx on public.pace_forum_posts (created_at desc);
create index pace_forum_posts_category_created_idx on public.pace_forum_posts (category, created_at desc);
create index pace_forum_replies_post_created_idx on public.pace_forum_replies (post_id, created_at);

create trigger pace_forum_posts_updated
  before update on public.pace_forum_posts
  for each row execute function public.pace_set_updated_at();

create trigger pace_forum_replies_updated
  before update on public.pace_forum_replies
  for each row execute function public.pace_set_updated_at();

create or replace function public.pace_update_forum_reply_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.pace_forum_posts
    set reply_count = reply_count + 1
    where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.pace_forum_posts
    set reply_count = greatest(reply_count - 1, 0)
    where id = old.post_id;
    return old;
  end if;

  return null;
end;
$$;

create trigger pace_forum_reply_count_insert
  after insert on public.pace_forum_replies
  for each row execute function public.pace_update_forum_reply_count();

create trigger pace_forum_reply_count_delete
  after delete on public.pace_forum_replies
  for each row execute function public.pace_update_forum_reply_count();

alter table public.pace_forum_posts enable row level security;
alter table public.pace_forum_replies enable row level security;
alter table public.pace_forum_post_votes enable row level security;
alter table public.pace_forum_reply_votes enable row level security;

grant select, insert on public.pace_forum_posts, public.pace_forum_replies, public.pace_forum_post_votes, public.pace_forum_reply_votes to authenticated;
grant update (title, body, category) on public.pace_forum_posts to authenticated;
grant update (body) on public.pace_forum_replies to authenticated;
grant delete on public.pace_forum_posts, public.pace_forum_replies, public.pace_forum_post_votes, public.pace_forum_reply_votes to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create policy "pace forum posts readable"
on public.pace_forum_posts
for select
to authenticated
using (true);

create policy "pace forum posts author insert"
on public.pace_forum_posts
for insert
to authenticated
with check (author_id = (select auth.uid()));

create policy "pace forum posts author update"
on public.pace_forum_posts
for update
to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

create policy "pace forum posts author delete"
on public.pace_forum_posts
for delete
to authenticated
using (author_id = (select auth.uid()));

create policy "pace forum replies readable"
on public.pace_forum_replies
for select
to authenticated
using (true);

create policy "pace forum replies author insert"
on public.pace_forum_replies
for insert
to authenticated
with check (author_id = (select auth.uid()));

create policy "pace forum replies author update"
on public.pace_forum_replies
for update
to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

create policy "pace forum replies author delete"
on public.pace_forum_replies
for delete
to authenticated
using (author_id = (select auth.uid()));

create policy "pace forum post votes self"
on public.pace_forum_post_votes
for all
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

create policy "pace forum reply votes self"
on public.pace_forum_reply_votes
for all
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

revoke all on function public.pace_update_forum_reply_count() from public;
