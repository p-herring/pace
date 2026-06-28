import { redirect } from "next/navigation";
import { NewPlanForm, type PlanFormInitial } from "@/components/new-plan-form";
import { formatPaceValue, isPlanEditable } from "@/lib/muster-action-helpers";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Local (server) date/time components — matches how the create action originally
// interpreted "YYYY-MM-DDTHH:MM" (as local time), so editing round-trips what was
// typed rather than drifting by a timezone offset.
function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function toTimeInputValue(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default async function EditPlan({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/muster");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/muster/sign-in");

  const { data: plan } = await supabase.from("pace_plans").select("*").eq("id", planId).maybeSingle();
  if (!plan || plan.host_id !== user.id) redirect("/muster");
  if (!isPlanEditable(plan.starts_at)) redirect(`/muster/plan/${planId}`);

  const { data: location } = await supabase
    .from("pace_plan_private_locations")
    .select("location_name,latitude,longitude,route_path")
    .eq("plan_id", planId)
    .maybeSingle();

  const sport = plan.sport as "run" | "ride" | "swim";
  const paceValue = plan.run_pace_seconds ?? plan.ride_speed_kmh ?? plan.swim_pace_seconds;
  const startsAt = new Date(plan.starts_at);

  const initial: PlanFormInitial = {
    planId: plan.id,
    title: plan.title,
    description: plan.description ?? "",
    sport,
    startDate: toDateInputValue(startsAt),
    startTime: toTimeInputValue(startsAt),
    suburb: { label: plan.suburb_label, latitude: Number(plan.discovery_latitude), longitude: Number(plan.discovery_longitude) },
    location: location
      ? { label: location.location_name, latitude: Number(location.latitude), longitude: Number(location.longitude) }
      : { label: plan.suburb_label, latitude: Number(plan.discovery_latitude), longitude: Number(plan.discovery_longitude) },
    distance: Number(plan.distance_km),
    pace: paceValue != null ? formatPaceValue(sport, paceValue).split(" ")[0] : "",
    visibility: plan.visibility as "public" | "radius" | "private",
    radiusKm: plan.discovery_radius_km ?? undefined,
    capacityMode: plan.capacity >= 100 ? "open" : "limited",
    capacityValue: plan.capacity >= 100 ? undefined : plan.capacity,
    approval: plan.requires_approval ? "yes" : "no",
    routePath: (location?.route_path as { lat: number; lng: number }[] | null) ?? undefined,
  };

  return (
    <main className="muster-app">
      
      <div className="muster-auth muster-auth-inner">
        <NewPlanForm initial={initial} />
      </div>
    </main>
  );
}
