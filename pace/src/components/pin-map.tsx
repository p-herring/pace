"use client";

import { useEffect, useRef } from "react";
import { Marker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { CtrlScrollZoom } from "./ctrl-scroll-zoom";

const pinIcon = L.divIcon({
  className: "pace-pin-icon",
  html: '<span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

function Recenter({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    map.panTo([latitude, longitude]);
  }, [latitude, longitude, map]);
  return null;
}

function ClickToMove({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onMove(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export default function PinMap({
  latitude,
  longitude,
  onMove,
}: {
  latitude: number;
  longitude: number;
  onMove: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      scrollWheelZoom={false}
      className="pace-pin-map"
      style={{ height: "220px", width: "100%" }}
    >
      <Recenter latitude={latitude} longitude={longitude} />
      <ClickToMove onMove={onMove} />
      <CtrlScrollZoom />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker
        position={[latitude, longitude]}
        icon={pinIcon}
        draggable
        eventHandlers={{
          dragend: (event) => {
            const { lat, lng } = event.target.getLatLng();
            onMove(lat, lng);
          },
        }}
      />
    </MapContainer>
  );
}
