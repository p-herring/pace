import Link from "next/link";
import { CalendarDays, MapPin, MoreHorizontal, Route, Users } from "lucide-react";
import { paceJoinPlanAction } from "@/app/actions/pace";
import { Avatar } from "@/components/avatar";
import { SPORT, type Sport } from "@/lib/sport";

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

export function PlanCard({ plan }: { plan: PlanCardData }) {
  const { Icon, label } = SPORT[plan.sport];
  const spotsLeft = Math.max(0, plan.capacity - plan.confirmedCount);
  const isFull = spotsLeft === 0;

  return (
    <article className="plan-card">
      <div className={`sport-rail ${plan.sport}`} />

      <div className="plan-card-top">
        <span className={`sport-label ${plan.sport}`}>
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <details className="plan-card-menu">
          <summary className="plan-card-menu-trigger" aria-label="More options">
            <MoreHorizontal className="h-4 w-4" />
          </summary>
          <div className="plan-card-menu-panel">
            <Link href={`/pace/report/${plan.id}`}>Report this plan</Link>
          </div>
        </details>
      </div>

      <h3>
        <Link href={`/pace/plan/${plan.id}`} className="plan-card-title-link">
          {plan.title}
        </Link>
      </h3>

      <div className="plan-card-host">
        <Avatar name={plan.host.displayName} avatarUrl={plan.host.avatarUrl} size={26} />
        <Link href={`/pace/profile/${plan.host.id}`}>{plan.host.displayName}</Link>
      </div>

      <div className="plan-card-stats">
        <p>
          <CalendarDays />
          {new Date(plan.startsAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}
        </p>
        <p>
          <MapPin /> {plan.suburbLabel}
        </p>
        <p>
          <Route /> {plan.distanceKm} km
        </p>
        <p>
          <Users /> {isFull ? "Full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
          {plan.requiresApproval ? " · approval required" : ""}
        </p>
      </div>

      <div className="plan-card-footer">
        <form action={paceJoinPlanAction}>
          <input type="hidden" name="planId" value={plan.id} />
          <input type="hidden" name="redirectTo" value="/pace" />
          <button className="pace-primary" type="submit" disabled={isFull && !plan.requiresApproval}>
            {plan.requiresApproval ? "Request to join" : isFull ? "Full" : "Join plan"}
          </button>
        </form>
      </div>
    </article>
  );
}
