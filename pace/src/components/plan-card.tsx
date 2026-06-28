import Link from "next/link";
import { type Sport } from "@/lib/sport";

export interface PlanCardData {
  id: string;
  title: string;
  sport: Sport;
  suburbLabel: string;
  startsAt: string;
  distanceKm: number;
  capacity: number;
  confirmedCount: number;
  visibility: string;
  requiresApproval: boolean;
  host: { id: string; displayName: string; avatarUrl: string | null };
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true });

  if (isToday) return `Today · ${time}`;
  if (isTomorrow) return `Tomorrow · ${time}`;
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" }) + ` · ${time}`;
}

export function PlanCard({ plan, currentUserId }: { plan: PlanCardData; currentUserId?: string }) {
  const spotsLeft = Math.max(0, plan.capacity - plan.confirmedCount);
  const isFull = spotsLeft === 0;
  const isHost = currentUserId === plan.host.id;

  const initials = plan.host.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const joinLabel = isFull ? "Waitlist" : plan.requiresApproval ? "Request" : "Join";

  return (
    <article>
      <Link href={`/muster/plan/${plan.id}`} className="plan-card-dark">
        <div className={`plan-card-dark-hero ${plan.sport}`}>
          <div className="plan-card-dark-sport">
            <span className={`plan-card-dark-sport-dot ${plan.sport}`} />
            {plan.sport.charAt(0).toUpperCase() + plan.sport.slice(1)}
          </div>
          {plan.requiresApproval && (
            <div className="plan-card-dark-approval">Approval required</div>
          )}
        </div>

        <div className="plan-card-dark-body">
          <p className="plan-card-dark-time">
            {formatTime(plan.startsAt)} · {plan.suburbLabel}
          </p>
          <h3 className="plan-card-dark-title">{plan.title}</h3>

          <div className="plan-card-dark-footer">
            <div style={{ display: "flex", alignItems: "center" }}>
              <div className="plan-card-dark-avatars">
                <div className="plan-card-dark-av">
                  {plan.host.avatarUrl
                    ? <img src={plan.host.avatarUrl} alt={plan.host.displayName} />
                    : initials}
                </div>
              </div>
              <span className={`plan-card-dark-spots ${isFull ? "full" : spotsLeft <= 3 ? "open" : ""}`}>
                {isFull ? "Full" : `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`}
              </span>
            </div>

            {!isHost && (
              <span className="plan-card-dark-join">{joinLabel}</span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
