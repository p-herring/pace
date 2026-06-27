"use client";

import { FileUp, Route, X } from "lucide-react";
import { useId, useState } from "react";
import type { RoutePoint } from "./route-map";

function pointsFromGpx(text: string): RoutePoint[] {
  const document = new DOMParser().parseFromString(text, "application/xml");
  if (document.querySelector("parsererror")) throw new Error("That file is not valid GPX.");
  return Array.from(document.querySelectorAll("trkpt, rtept"))
    .map((point) => ({ lat: Number(point.getAttribute("lat")), lng: Number(point.getAttribute("lon")) }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

export function GpxUpload({ initialPath }: { initialPath?: RoutePoint[] }) {
  const inputId = useId();
  const [fileName, setFileName] = useState<string | null>(initialPath?.length ? "Existing GPX route" : null);
  const [path, setPath] = useState<RoutePoint[]>(initialPath ?? []);
  const [error, setError] = useState("");

  async function choose(file?: File) {
    setError("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".gpx")) return setError("Choose a .gpx file exported from Garmin, Strava or another route planner.");
    if (file.size > 5 * 1024 * 1024) return setError("Keep GPX files under 5 MB.");
    try {
      const points = pointsFromGpx(await file.text());
      if (points.length < 2) throw new Error("We couldn’t find a route in that GPX file.");
      setPath(points);
      setFileName(file.name);
    } catch (uploadError) {
      setPath([]);
      setFileName(null);
      setError(uploadError instanceof Error ? uploadError.message : "We couldn’t read that GPX file.");
    }
  }

  return (
    <section className="gpx-upload" aria-labelledby={`${inputId}-title`}>
      <div className="gpx-upload-copy">
        <span className="gpx-upload-icon"><Route className="h-5 w-5" /></span>
        <div><h2 id={`${inputId}-title`}>Route file <span>(optional)</span></h2><p>Export a GPX from Garmin, Strava or your preferred planner. We’ll attach it to the plan.</p></div>
      </div>
      {fileName ? <div className="gpx-file"><span>{fileName}{path.length ? ` · ${path.length.toLocaleString()} route points` : ""}</span><button type="button" onClick={() => { setFileName(null); setPath([]); }} aria-label="Remove GPX file"><X className="h-4 w-4" /></button></div> : null}
      <label htmlFor={inputId} className="gpx-upload-button"><FileUp className="h-4 w-4" />{fileName ? "Replace GPX" : "Upload GPX"}</label>
      <input id={inputId} name="gpxFile" type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" onChange={(event) => choose(event.target.files?.[0])} />
      {error ? <p className="form-error">{error}</p> : null}
      <input type="hidden" name="routePath" value={path.length > 1 ? JSON.stringify(path) : ""} />
    </section>
  );
}
