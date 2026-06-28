import Link from "next/link";
import { redirect } from "next/navigation";
import { FeedWithMap, type FeedPlan } from "@/components/feed-with-map";
import { PaceHeader } from "@/components/pace-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PaceHome({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return (
      <main className="pace-app">
        <div className="pace-empty">
          <h2>Pace is being connected</h2>
          <p>The beta database configuration is not available yet. Please try again in a moment.</p>
        </div>
      </main>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/pace/sign-in");

  const { data: plans } = await supabase
    .from("pace_plans")
    .select(
      "id,host_id,title,sport,starts_at,suburb_label,distance_km,capacity,status,visibility,requires_approval,discovery_latitude,discovery_longitude,host:pace_profiles!pace_plans_host_id_fkey(display_name,avatar_url)",
    )
    .order("starts_at");
  const { error, message } = await searchParams;

  // Private plans you're invited to or confirmed on come back from the same query
  // (RLS allows it), but they don't belong mixed into the public discovery map/grid
  // — they get their own section below instead.
  const publicPlans = (plans ?? []).filter((plan) => plan.visibility !== "private");
  const planIds = publicPlans.map((plan) => plan.id);

  const { data: confirmedRows } = planIds.length
    ? await supabase.from("pace_plan_participants").select("plan_id").eq("status", "confirmed").in("plan_id", planIds)
    : { data: [] as { plan_id: string }[] };

  const confirmedCounts = new Map<string, number>();
  for (const row of confirmedRows ?? []) {
    confirmedCounts.set(row.plan_id, (confirmedCounts.get(row.plan_id) ?? 0) + 1);
  }

  const feedPlans: FeedPlan[] = publicPlans.map((plan) => {
    const host = Array.isArray(plan.host) ? plan.host[0] : plan.host;
    return {
      id: plan.id,
      title: plan.title,
      sport: plan.sport as "run" | "ride" | "swim",
      suburbLabel: plan.suburb_label,
      startsAt: plan.starts_at,
      distanceKm: plan.distance_km,
      discoveryLatitude: plan.discovery_latitude,
      discoveryLongitude: plan.discovery_longitude,
      capacity: plan.capacity,
      confirmedCount: confirmedCounts.get(plan.id) ?? 0,
      visibility: plan.visibility,
      requiresApproval: plan.requires_approval,
      host: { id: plan.host_id, displayName: host?.display_name ?? "A Pace member", avatarUrl: host?.avatar_url ?? null },
    };
  });

  const { data: privateInvolvements } = await supabase
    .from("pace_plan_participants")
    .select("status,plan:pace_plans!inner(id,title,starts_at,visibility)")
    .eq("profile_id", user.id)
    .in("status", ["invited", "confirmed"]);

  const privatePlans = (privateInvolvements ?? [])
    .map((row) => ({ status: row.status, plan: Array.isArray(row.plan) ? row.plan[0] : row.plan }))
    .filter((row) => row.plan?.visibility === "private");

  return (
    <main className="pace-shell min-h-screen">
      <PaceHeader />

      <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="pace-kicker">Perth beta</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-pace-ink sm:text-4xl">
              Plans near you
            </h1>
            <p className="mt-2 max-w-xl text-pace-muted">
              Pan or zoom the map to narrow the list to your area.
            </p>
          </div>
        </div>

        {error && <p className="form-error mt-6">{error}</p>}
        {message && <p className="form-success mt-6">{message}</p>}

        {privatePlans.length > 0 ? (
          <div className="mt-6 private-plans-section">
            <p className="pace-kicker">Private plans</p>
            <div className="mt-3 grid gap-2">
              {privatePlans.map(({ status, plan }) => (
                <Link key={plan!.id} href={`/pace/plan/${plan!.id}`} className="private-plan-row">
                  <span>{plan!.title}</span>
                  <span className="private-plan-status">{status === "invited" ? "Invited" : "Confirmed"}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <FeedWithMap plans={feedPlans} />
      </section>
    </main>
  );
}
