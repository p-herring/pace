"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { PlanCard, type PlanCardData } from "@/components/plan-card";
import type { FeedMapPlan } from "./muster-feed-map";

export interface FeedPlan extends FeedMapPlan, Omit<PlanCardData, "id" | "title" | "sport" | "suburbLabel" | "startsAt" | "distanceKm"> {}

type SportFilter = "all" | "run" | "ride" | "swim";

const FILTERS: { key: SportFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "run", label: "Run" },
  { key: "ride", label: "Ride" },
  { key: "swim", label: "Swim" },
];

export function FeedWithMap({ plans, currentUserId }: { plans: FeedPlan[]; currentUserId?: string }) {
  const [filter, setFilter] = useState<SportFilter>("all");

  const visiblePlans = useMemo(
    () => (filter === "all" ? plans : plans.filter((p) => p.sport === filter)),
    [plans, filter],
  );

  return (
    <>
      {/* Sport filter pills */}
      <div className="app-filter-row" role="group" aria-label="Filter by sport">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            className={`app-filter-pill${filter === key ? " active" : ""}`}
            aria-current={filter === key ? "true" : undefined}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Plan cards */}
      {visiblePlans.length ? (
        <div>
          {visiblePlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} currentUserId={currentUserId} />
          ))}
        </div>
      ) : (
        <div className="app-empty">
          <Users />
          <h3>{plans.length ? "No plans in this category" : "No plans yet"}</h3>
          <p>
            {plans.length
              ? "Try a different sport filter, or be the one to post one."
              : "Be the first to post a plan and get people moving."}
          </p>
          <Link className="app-cta-join" href="/muster/new" style={{ marginTop: 16, display: "inline-block", width: "auto", padding: "14px 28px" }}>
            Post a plan
          </Link>
        </div>
      )}
    </>
  );
}
