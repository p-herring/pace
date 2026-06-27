"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

/**
 * Requires Ctrl (Windows/Linux) or Cmd (Mac) held down to zoom the map with the
 * scroll wheel/trackpad — a plain scroll passes through to scroll the page instead.
 * Without this, any map embedded in a normal scrolling page hijacks the scroll the
 * moment the cursor passes over it, which is the standard Google-Maps-style trap.
 */
export function CtrlScrollZoom() {
  const map = useMap();

  useEffect(() => {
    map.scrollWheelZoom.disable();
    const container = map.getContainer();

    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const delta = event.deltaY < 0 ? 1 : -1;
      map.setZoom(map.getZoom() + delta);
    }

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [map]);

  return null;
}
