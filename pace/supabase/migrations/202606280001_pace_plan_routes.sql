-- Adds an optional drawn route to a plan. Lives on pace_plan_private_locations
-- (not pace_plans) deliberately: a literal path is at least as revealing as the
-- exact meeting point, so it gets the same protection — visible only to the host
-- and confirmed participants, never in public discovery.
--
-- No PostGIS in this project, so the path is stored as plain JSON: an ordered
-- array of [lat, lng] pairs. Distance is computed server-side from the path (not
-- trusted from the client) and cached here for display.

alter table public.pace_plan_private_locations
  add column route_path jsonb,
  add column route_distance_km numeric;

alter table public.pace_plan_private_locations
  add constraint pace_plan_private_locations_route_path_check
    check (route_path is null or jsonb_array_length(route_path) between 2 and 500),
  add constraint pace_plan_private_locations_route_distance_km_check
    check (route_distance_km is null or (route_distance_km > 0 and route_distance_km <= 1000));
