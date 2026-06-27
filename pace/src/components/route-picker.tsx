"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { routeDistanceKm } from "@/lib/pace-action-helpers";
import type { RoutePoint } from "./route-map";

const RouteMap = dynamic(() => import("./route-map"), { ssr: false });

const PERTH_CENTRE: RoutePoint = { lat: -31.9523, lng: 115.8613 };

export function RoutePicker({
  name,
  center,
  initialPath,
  distanceFieldId,
}: {
  name: string;
  /** Centres the map near the chosen meeting point, when one's been picked. */
  center?: RoutePoint;
  initialPath?: RoutePoint[];
  /** id of the plan's Distance input, so "Use this distance" can fill it in directly. */
  distanceFieldId: string;
}) {
  const [path, setPath] = useState<RoutePoint[]>(initialPath ?? []);
  const distance = routeDistanceKm(path);

  function addPoint(point: RoutePoint) {
    setPath((current) => [...current, point]);
  }

  function movePoint(index: number, point: RoutePoint) {
    setPath((current) => current.map((existing, i) => (i === index ? point : existing)));
  }

  function undo() {
    setPath((current) => current.slice(0, -1));
  }

  function clear() {
    setPath([]);
  }

  function useThisDistance() {
    const field = document.getElementById(distanceFieldId) as HTMLInputElement | null;
    if (!field) return;
    field.value = distance.toFixed(1);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }

  return (
    <div className="route-picker">
      <label>Route (optional)</label>
      <p className="field-hint">
        Click the map to drop points and draw the path you’ll take — drag a point to adjust it.
        {path.length > 1 ? ` ${distance.toFixed(1)} km so far.` : ""}
      </p>
      <RouteMap center={center ?? PERTH_CENTRE} path={path} onAddPoint={addPoint} onMovePoint={movePoint} />
      <div className="route-picker-controls">
        <button type="button" onClick={undo} disabled={path.length === 0}>
          Undo last point
        </button>
        <button type="button" onClick={clear} disabled={path.length === 0}>
          Clear route
        </button>
        {path.length > 1 ? (
          <button type="button" onClick={useThisDistance} className="route-picker-use-distance">
            Use this distance ({distance.toFixed(1)} km)
          </button>
        ) : null}
      </div>
      <input type="hidden" name={name} value={path.length > 1 ? JSON.stringify(path) : ""} />
    </div>
  );
}
