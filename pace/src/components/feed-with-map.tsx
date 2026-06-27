"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { PlanCard, type PlanCardData } from "@/components/plan-card";
import type { FeedMapPlan, MapBounds } from "./pace-feed-map";

const PaceFeedMap = dynamic(() => import("./pace-feed-map"), { ssr: false });

export interface FeedPlan extends FeedMapPlan, Omit<PlanCardData, "id" | "title" | "sport" | "suburbLabel" | "startsAt" | "distanceKm"> {}

function isWithinBounds(plan: FeedPlan, bounds: MapBounds | null): boolean {
  if (!bounds) return true;
  return (
    plan.discoveryLatitude <= bounds.north &&
    plan.discoveryLatitude >= bounds.south &&
    plan.discoveryLongitude <= bounds.east &&
    plan.discoveryLongitude >= bounds.west
  );
}

export function FeedWithMap({ plans }: { plans: FeedPlan[] }) {
  const [bounds, setBounds] = useState<MapBounds | null>(null);

  const visiblePlans = useMemo(() => plans.filter((plan) => isWithinBounds(plan, bounds)), [plans, bounds]);

  return (
    <>
      {plans.length > 0 ? (
        <div className="mt-8">
          <div className="live-map">
            <div className="map-head">
              <div>
                <span className="map-pulse" /> <b>Perth activity map</b>
                <small>
                  {visiblePlans.length} of {plans.length} plans in view
                </small>
              </div>
              <span>Pan and zoom to filter the list below</span>
            </div>
            <div className="map-canvas">
              <PaceFeedMap plans={plans} onBoundsChange={setBounds} />
            </div>
            <p className="map-key">
              <span className="map-pulse" /> The list below only shows plans currently on screen · Ctrl/Cmd + scroll to
              zoom · © OpenStreetMap contributors
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {visiblePlans.length ? (
          visiblePlans.map((plan) => <PlanCard key={plan.id} plan={plan} />)
        ) : (
          <div className="pace-empty">
            <h2>{plans.length ? "Nothing in view here" : "No plans yet"}</h2>
            <p>
              {plans.length
                ? "Pan or zoom out on the map to see more plans."
                : "Be the person who starts the first one."}
            </p>
            <Link className="pace-primary" href="/pace/new">
              Post a plan
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
