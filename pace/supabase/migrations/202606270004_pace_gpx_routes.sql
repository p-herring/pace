alter table public.pace_plan_private_locations
  add column if not exists gpx_file_path text;

insert into storage.buckets (id, name, public, file_size_limit)
values ('pace-routes', 'pace-routes', false, 5242880)
on conflict (id) do update set public = false, file_size_limit = 5242880;
