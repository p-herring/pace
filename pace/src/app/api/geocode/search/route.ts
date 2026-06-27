import { NextResponse, type NextRequest } from "next/server";
import { geocodeSearch } from "@/lib/geocode";

// Server-side proxy to Nominatim. Browsers shouldn't call it directly: their usage
// policy requires a descriptive User-Agent (browser fetches can't reliably send one)
// and a single identifiable caller for rate-limiting — proxying through our own route
// satisfies both, and reuses the same geocodeSearch() helper used elsewhere.

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await geocodeSearch(query, 5);
  return NextResponse.json({ results });
}
