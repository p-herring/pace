import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Lock, MapPin, Route as RouteIcon, ShieldAlert, Users } from "lucide-react";
import { paceJoinPlanAction, paceLeavePlanAction, paceMarkPlanCompletedAction } from "@/app/actions/pace";
import { Avatar, AvatarStack } from "@/components/avatar";
import { InvitePeople } from "@/components/invite-people";
import { PaceHeader } from "@/components/pace-header";
import { PlanChat, type PlanChatMessage } from "@/components/plan-chat";
import { RouteDisplay } from "@/components/route-display";
import { formatPaceValue, isPlanEditable } from "@/lib/pace-action-helpers";
import { SPORT, type Sport } from "@/lib/sport";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const statusCopy: Record<string, string> = {
  confirmed: "You’re confirmed",
  attended: "You completed this plan",
  waitlisted: "You’re on the waitlist",
  requested: "Your request is pending approval",
};

export default async function PlanDetail({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { planId } = await params;
  const { error, message } = await searchParams;

  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/pace");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/pace/sign-in");

  const { data: plan } = await supabase
    .from("pace_plans")
    .select(
      "id,host_id,title,description,sport,starts_at,suburb_label,distance_km,capacity,status,visibility,discovery_radius_km,requires_approval,run_pace_seconds,ride_speed_kmh,swim_pace_seconds,host:pace_profiles!pace_plans_host_id_fkey(display_name,avatar_url)",
    )
    .eq("id", planId)
    .maybeSingle();

  if (!plan) redirect("/pace");

  const isHost = plan.host_id === user.id;

  const [{ data: myParticipation }, { data: confirmedParticipants }, { data: privateLocation }] = await Promise.all([
    isHost
      ? Promise.resolve({ data: null })
      : supabase.from("pace_plan_participants").select("status").eq("plan_id", planId).eq("profile_id", user.id).maybeSingle(),
    supabase
      .from("pace_plan_participants")
      .select("profile:pace_profiles!inner(display_name,avatar_url)")
      .eq("plan_id", planId)
      .in("status", ["confirmed", "attended"]),
    supabase.from("pace_plan_private_locations").select("location_name,latitude,longitude,route_path,route_distance_km").eq("plan_id", planId).maybeSingle(),
  ]);

  const sport = plan.sport as Sport;
  const { Icon, label } = SPORT[sport];
  const paceValue = plan.run_pace_seconds ?? plan.ride_speed_kmh ?? plan.swim_pace_seconds;
  const editable = isPlanEditable(plan.starts_at);
  const joined = myParticipation?.status === "confirmed";
  const attended = myParticipation?.status === "attended";
  const pending = myParticipation && ["waitlisted", "requested"].includes(myParticipation.status);
  const invited = myParticipation?.status === "invited";
  const host = Array.isArray(plan.host) ? plan.host[0] : plan.host;
  const planHasStarted = new Date(plan.starts_at).getTime() <= new Date().getTime();
  const canChat = isHost || joined || attended;
  const chatReadOnly = plan.status === "cancelled";

  const confirmed = (confirmedParticipants ?? []).map((row) => {
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    return { name: profile?.display_name ?? "Pace member", avatarUrl: profile?.avatar_url ?? null };
  });

  const { data: rawMessages } = canChat
    ? await supabase
        .from("pace_plan_messages")
        .select("id,plan_id,sender_id,body,created_at,sender:pace_profiles!pace_plan_messages_sender_id_fkey(display_name,avatar_url)")
        .eq("plan_id", planId)
        .order("created_at", { ascending: true })
        .limit(50)
    : { data: [] };

  const messages: PlanChatMessage[] = (rawMessages ?? []).map((message) => {
    const sender = Array.isArray(message.sender) ? message.sender[0] : message.sender;
    return {
      id: message.id,
      plan_id: message.plan_id,
      sender_id: message.sender_id,
      body: message.body,
      created_at: message.created_at,
      sender: {
        display_name: sender?.display_name ?? "Pace member",
        avatar_url: sender?.avatar_url ?? null,
      },
    };
  });

  return (
    <main className="pace-shell min-h-screen">
      <PaceHeader />

      <section className="mx-auto max-w-3xl px-5 pb-20 sm:px-8">
        <article className="plan-detail-card">
          <div className={`sport-rail ${sport}`} />
          <div className="plan-detail-body">
            <span className={`sport-label ${sport}`}>
              <Icon className="h-3.5 w-3.5" /> {label} · {plan.visibility}
            </span>
            <h1>{plan.title}</h1>

            <div className="plan-detail-host-row">
              <Avatar name={host?.display_name ?? "Pace member"} avatarUrl={host?.avatar_url} size={36} />
              <div>
                <span>
                  Hosted by{" "}
                  <Link href={`/pace/profile/${plan.host_id}`} className="pace-text">
                    {host?.display_name ?? "a Pace member"}
                  </Link>
                </span>
                {isHost ? <small>That’s you</small> : null}
              </div>
            </div>

            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-success">{message}</p>}

            {plan.description ? <p className="plan-detail-description">{plan.description}</p> : null}

            <div className="plan-detail-people">
              <div className="plan-detail-people-head">
                <p>
                  {confirmed.length}/{plan.capacity} joined
                </p>
                {!isHost && (joined || pending || invited) ? (
                  <span className="badge badge-positive">You’re in</span>
                ) : null}
              </div>
              {confirmed.length > 0 ? (
                <AvatarStack people={confirmed} />
              ) : (
                <p className="plan-detail-people-empty">Nobody’s confirmed yet — be the first to join.</p>
              )}
            </div>

            <div className="plan-detail-grid">
              <p>
                <CalendarDays className="inline h-4 w-4" />{" "}
                {new Date(plan.starts_at).toLocaleString("en-AU", { dateStyle: "full", timeStyle: "short" })}
              </p>
              <p>
                <MapPin className="inline h-4 w-4" /> {plan.suburb_label}
                {plan.visibility === "radius" ? ` · within ${plan.discovery_radius_km} km` : ""}
              </p>
              <p>
                <RouteIcon className="inline h-4 w-4" /> {plan.distance_km} km
                {paceValue != null ? ` · ${formatPaceValue(sport, paceValue)}` : ""}
              </p>
              <p>
                <Users className="inline h-4 w-4" /> {plan.requires_approval ? "Approval required" : "Instant join"}
              </p>
            </div>

            {privateLocation ? (
              <div className="plan-detail-location">
                <p className="pace-kicker">Meeting point</p>
                <p>{privateLocation.location_name}</p>
              </div>
            ) : (
              <div className="plan-detail-location plan-detail-location-locked">
                <Lock className="h-4 w-4" />
                <p>The exact meeting point unlocks once you’re confirmed on this plan.</p>
              </div>
            )}

            {privateLocation?.route_path ? (
              <RouteDisplay path={privateLocation.route_path as { lat: number; lng: number }[]} />
            ) : null}

            <PlanChat
              planId={plan.id}
              currentUserId={user.id}
              canChat={canChat}
              isReadOnly={chatReadOnly}
              initialMessages={messages}
            />

            {isHost && plan.visibility === "private" ? <InvitePeople planId={plan.id} /> : null}

            {isHost && !editable ? (
              <div className="plan-edit-closed-banner">
                <ShieldAlert className="h-4 w-4" />
                <p>Editing is closed — this plan starts within 48 hours.</p>
              </div>
            ) : null}

            <div className="plan-detail-actions">
              {isHost ? (
                editable ? (
                  <Link className="pace-primary" href={`/pace/plan/${plan.id}/edit`}>
                    Edit plan
                  </Link>
                ) : null
              ) : invited ? (
                <>
                  <form action={paceJoinPlanAction}>
                    <input type="hidden" name="planId" value={plan.id} />
                    <button type="submit" className="pace-primary">
                      Accept invite
                    </button>
                  </form>
                  <form action={paceLeavePlanAction}>
                    <input type="hidden" name="planId" value={plan.id} />
                    <button type="submit" className="pace-secondary">
                      Decline
                    </button>
                  </form>
                </>
              ) : joined || attended || pending ? (
                <>
                  <span className="badge badge-positive">{statusCopy[myParticipation!.status] ?? "You’re on this plan"}</span>
                  {joined && planHasStarted ? (
                    <form action={paceMarkPlanCompletedAction}>
                      <input type="hidden" name="planId" value={plan.id} />
                      <button type="submit" className="pace-primary">
                        Mark completed
                      </button>
                    </form>
                  ) : null}
                  <form action={paceLeavePlanAction}>
                    <input type="hidden" name="planId" value={plan.id} />
                    <button type="submit" className="pace-secondary">
                      {pending ? "Cancel request" : "Leave plan"}
                    </button>
                  </form>
                </>
              ) : (
                <form action={paceJoinPlanAction}>
                  <input type="hidden" name="planId" value={plan.id} />
                  <button type="submit" className="pace-primary">
                    {plan.requires_approval ? "Request to join" : "Join plan"}
                  </button>
                </form>
              )}
            </div>

            {!isHost ? (
              <div className="plan-detail-meta-row">
                <Link href={`/pace/report/${plan.id}`} className="pace-text">
                  Report this plan
                </Link>
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
