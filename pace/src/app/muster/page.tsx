import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { FeedWithMap, type FeedPlan } from "@/components/feed-with-map";
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
      <main className="muster-app">
        <div className="muster-empty">
          <h2>Muster is being connected</h2>
          <p>The beta database configuration is not available yet. Please try again in a moment.</p>
        </div>
      </main>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/muster/sign-in");

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
      host: { id: plan.host_id, displayName: host?.display_name ?? "A Muster member", avatarUrl: host?.avatar_url ?? null },
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
    <main>
      {/* Screen header */}
      <div className="app-screen-top" />
      <div className="app-header">
        <h1 className="app-header-title">Muster</h1>
      </div>

      {error && <div className="app-alert app-alert-error">{error}</div>}
      {message && <div className="app-alert app-alert-success">{message}</div>}

      {privatePlans.length > 0 && (
        <div style={{ padding: "0 16px 8px" }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--app-muted)", margin: "0 0 8px" }}>Private plans</p>
          <div style={{ display: "grid", gap: 8 }}>
            {privatePlans.map(({ status, plan }) => (
              <Link key={plan!.id} href={`/muster/plan/${plan!.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--app-card)", borderRadius: 14, padding: "12px 14px", fontSize: 14, fontWeight: 700, color: "var(--app-ink)", textDecoration: "none" }}>
                <span>{plan!.title}</span>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--app-accent)" }}>{status === "invited" ? "Invited" : "Confirmed"}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <FeedWithMap plans={feedPlans} currentUserId={user.id} />
    </main>
  );
}
