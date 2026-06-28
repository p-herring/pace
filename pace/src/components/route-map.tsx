"use client";

import L from "leaflet";
import { Marker, MapContainer, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { CtrlScrollZoom } from "./ctrl-scroll-zoom";

export interface RoutePoint {
  lat: number;
  lng: number;
}

const pointIcon = L.divIcon({
  className: "muster-route-point",
  html: "<span></span>",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function ClickToAddPoint({ onAdd }: { onAdd: (point: RoutePoint) => void }) {
  useMapEvents({
    click(event) {
      onAdd({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

function Recenter({ center }: { center: RoutePoint }) {
  const map = useMap();
  // Only recenters when the map hasn't already moved away from a route-less default —
  // re-centering aggressively while someone is actively drawing would be disorienting.
  if (map.getZoom() < 12) {
    map.setView([center.lat, center.lng], 14);
  }
  return null;
}

export default function RouteMap({
  center,
  path,
  onAddPoint,
  onMovePoint,
  readOnly = false,
}: {
  center: RoutePoint;
  path: RoutePoint[];
  onAddPoint?: (point: RoutePoint) => void;
  onMovePoint?: (index: number, point: RoutePoint) => void;
  readOnly?: boolean;
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      scrollWheelZoom={false}
      className="muster-route-map"
      style={{ height: "260px", width: "100%" }}
    >
      <CtrlScrollZoom />
      {!readOnly && path.length === 0 ? <Recenter center={center} /> : null}
      {!readOnly && onAddPoint ? <ClickToAddPoint onAdd={onAddPoint} /> : null}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {path.length > 1 ? (
        <Polyline positions={path.map((point) => [point.lat, point.lng])} pathOptions={{ color: "#E85D3F", weight: 4 }} />
      ) : null}
      {!readOnly
        ? path.map((point, index) => (
            <Marker
              key={index}
              position={[point.lat, point.lng]}
              icon={pointIcon}
              draggable
              eventHandlers={{
                dragend: (event) => {
                  const { lat, lng } = event.target.getLatLng();
                  onMovePoint?.(index, { lat, lng });
                },
              }}
            />
          ))
        : null}
    </MapContainer>
  );
}
