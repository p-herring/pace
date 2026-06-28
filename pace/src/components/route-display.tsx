"use client";

import dynamic from "next/dynamic";
import type { RoutePoint } from "./route-map";

const RouteMap = dynamic(() => import("./route-map"), { ssr: false });

export function RouteDisplay({ path }: { path: RoutePoint[] }) {
  if (path.length < 2) return null;
  return (
    <div className="route-picker">
      <p className="muster-kicker">Route</p>
      <RouteMap center={path[0]} path={path} readOnly />
    </div>
  );
}
