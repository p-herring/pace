import { NextResponse, type NextRequest } from "next/server";
import { reverseGeocode } from "@/lib/geocode";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ label: null });
  }

  const label = await reverseGeocode(lat, lng);
  return NextResponse.json({ label });
}
