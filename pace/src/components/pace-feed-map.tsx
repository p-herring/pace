"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CircleMarker, MapContainer, Popup, TileLayer, useMapEvents } from "react-leaflet";
import { CtrlScrollZoom } from "./ctrl-scroll-zoom";
import { SPORT } from "@/lib/sport";

export interface FeedMapPlan {
  id: string;
  title: string;
  sport: "run" | "ride" | "swim";
  suburbLabel: string;
  startsAt: string;
  distanceKm: number;
  discoveryLatitude: number;
  discoveryLongitude: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

const PERTH_CENTRE: [number, number] = [-31.9523, 115.8613];

function BoundsReporter({ onBoundsChange }: { onBoundsChange?: (bounds: MapBounds) => void }) {
  const map = useMapEvents({
    moveend: report,
    zoomend: report,
  });

  function report() {
    const b = map.getBounds();
    onBoundsChange?.({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
  }

  // Report the initial view too, not just subsequent pans/zooms.
  useEffect(() => {
    report();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function PaceFeedMap({
  plans,
  onBoundsChange,
}: {
  plans: FeedMapPlan[];
  onBoundsChange?: (bounds: MapBounds) => void;
}) {
  return (
    <MapContainer
      center={PERTH_CENTRE}
      zoom={11}
      scrollWheelZoom={false}
      className="pace-leaflet-map"
      style={{ height: "100%", width: "100%" }}
    >
      <CtrlScrollZoom />
      <BoundsReporter onBoundsChange={onBoundsChange} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {plans.map((plan) => (
        <CircleMarker
          key={plan.id}
          center={[plan.discoveryLatitude, plan.discoveryLongitude]}
          radius={11}
          pathOptions={{ color: "#fff", weight: 3, fillColor: SPORT[plan.sport].hex, fillOpacity: 1 }}
        >
          <Popup>
            <Link href={`/pace/plan/${plan.id}`} className="map-popup-title">
              <strong>{plan.title}</strong>
            </Link>
            <br />
            {plan.suburbLabel}
            <br />
            {new Date(plan.startsAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
            {plan.distanceKm} km
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
