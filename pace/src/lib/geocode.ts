// Beta-stage geocoding using OpenStreetMap's free Nominatim search API — the same
// data source already used for map tiles in src/components/perth-map.tsx, so this
// adds no new provider/account to manage. Nominatim's usage policy caps free use at
// roughly one request/second and requires a descriptive User-Agent; that's fine for
// a single-city beta but will need a paid provider (Mapbox, Google, etc.) before any
// real launch volume — see docs/PACE_BETA_SETUP.md.

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Muster-Beta/1.0 (+https://github.com/p-herring/pace)";

/** Returns up to `limit` matches for `query`, most-relevant first. */
export async function geocodeSearch(query: string, limit = 5): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("countrycodes", "au");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      // Nominatim results for a fixed query don't change minute to minute; a short
      // cache keeps a popular suburb name from re-hitting the API on every request.
      next: { revalidate: 60 * 60 },
    });
  } catch {
    return [];
  }

  if (!response.ok) return [];

  const raw = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  return raw
    .map((item) => ({
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      displayName: item.display_name,
    }))
    .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
}

/** Convenience wrapper for callers that just want the single best match. */
export async function geocode(query: string): Promise<GeocodeResult | null> {
  const [first] = await geocodeSearch(query, 1);
  return first ?? null;
}

/** Turns a dragged-pin coordinate back into a human-readable address. */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "jsonv2");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      next: { revalidate: 60 * 60 },
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;
  const data = (await response.json()) as { display_name?: string };
  return data.display_name ?? null;
}
