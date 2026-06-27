// Pure helpers shared by the Pace server actions, kept outside any "use server"
// file specifically so they can be unit tested without the Next.js server
// runtime involved.

export function withParam(path: string, key: "error" | "message", value: string) {
  return `${path}?${key}=${encodeURIComponent(value)}`;
}

export function errorParam(path: string, value: string) {
  return withParam(path, "error", value);
}

/** Rejects protocol-relative ("//host") redirect targets, not just relative-looking ones. */
export function safeNextPath(value: FormDataEntryValue | null, fallback = "/pace") {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return fallback;
}

export type PaceSport = "run" | "ride" | "swim";

/**
 * Parses the "pace" field, whose meaning and format depend on the sport:
 * run/swim use "m:ss" (minutes:seconds per km or per 100m); ride uses a plain
 * km/h decimal. Returns the raw seconds (run/swim) or km/h (ride) the database
 * expects, or null if the input doesn't match the expected format for that sport.
 */
export function parsePaceInput(sport: PaceSport, raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (sport === "ride") {
    const value = Number(trimmed);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  const match = trimmed.match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const total = minutes * 60 + seconds;
  return total > 0 ? total : null;
}

/** Inverse of parsePaceInput — formats stored seconds/km-h back into a readable label. */
export function formatPaceValue(sport: PaceSport, value: number): string {
  if (sport === "ride") return `${value} km/h`;
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  const unit = sport === "run" ? "/km" : "/100m";
  return `${minutes}:${String(seconds).padStart(2, "0")} ${unit}`;
}

/** Hours between now and `startsAt`; negative once the plan has already started. */
export function hoursUntil(startsAt: string | Date): number {
  const start = startsAt instanceof Date ? startsAt : new Date(startsAt);
  return (start.getTime() - Date.now()) / (60 * 60 * 1000);
}

export const PLAN_EDIT_CUTOFF_HOURS = 48;

export function isPlanEditable(startsAt: string | Date): boolean {
  return hoursUntil(startsAt) > PLAN_EDIT_CUTOFF_HOURS;
}

export interface RoutePoint {
  lat: number;
  lng: number;
}

/** Great-circle distance between two points, in km. */
function haversineKm(a: RoutePoint, b: RoutePoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Total length of a drawn route — the straight-line sum between consecutive points. */
export function routeDistanceKm(points: RoutePoint[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversineKm(points[i - 1], points[i]);
  }
  return total;
}

/**
 * Parses and validates a route submitted as a JSON string of [lat, lng] pairs.
 * Returns null for anything missing/malformed rather than throwing, since a route
 * is always optional.
 */
export function parseRoutePath(raw: string | null | undefined): RoutePoint[] | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length < 2 || parsed.length > 500) return null;

  const points: RoutePoint[] = [];
  for (const item of parsed) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as RoutePoint).lat !== "number" ||
      typeof (item as RoutePoint).lng !== "number" ||
      !Number.isFinite((item as RoutePoint).lat) ||
      !Number.isFinite((item as RoutePoint).lng) ||
      Math.abs((item as RoutePoint).lat) > 90 ||
      Math.abs((item as RoutePoint).lng) > 180
    ) {
      return null;
    }
    points.push({ lat: (item as RoutePoint).lat, lng: (item as RoutePoint).lng });
  }
  return points;
}
