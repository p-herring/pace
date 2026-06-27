import { afterEach, describe, expect, it, vi } from "vitest";
import { geocode, geocodeSearch, reverseGeocode } from "@/lib/geocode";

function mockFetchOnce(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      json: async () => body,
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("geocodeSearch", () => {
  it("returns [] for an empty query without calling fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await geocodeSearch("   ")).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("parses a successful Nominatim response into multiple results", async () => {
    mockFetchOnce([
      { lat: "-31.9523", lon: "115.8613", display_name: "Perth WA" },
      { lat: "-31.9768", lon: "115.8586", display_name: "South Perth WA" },
    ]);
    const results = await geocodeSearch("Perth");
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ latitude: -31.9523, longitude: 115.8613, displayName: "Perth WA" });
  });

  it("returns [] when there are no results", async () => {
    mockFetchOnce([]);
    expect(await geocodeSearch("somewhere that does not exist")).toEqual([]);
  });

  it("returns [] on a non-OK response instead of throwing", async () => {
    mockFetchOnce([], false);
    expect(await geocodeSearch("Perth")).toEqual([]);
  });

  it("returns [] if fetch itself rejects (network error)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    expect(await geocodeSearch("Perth")).toEqual([]);
  });

  it("sets a descriptive User-Agent per Nominatim's usage policy", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchSpy);
    await geocodeSearch("Perth");
    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers["User-Agent"]).toMatch(/Pace-Beta/);
  });

  it("respects the limit parameter", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchSpy);
    await geocodeSearch("Perth", 5);
    const [url] = fetchSpy.mock.calls[0];
    expect(url.searchParams.get("limit")).toBe("5");
  });
});

describe("geocode", () => {
  it("returns the single best match", async () => {
    mockFetchOnce([{ lat: "-31.95", lon: "115.86", display_name: "Perth WA" }]);
    expect(await geocode("Perth")).toEqual({ latitude: -31.95, longitude: 115.86, displayName: "Perth WA" });
  });

  it("returns null when there are no matches", async () => {
    mockFetchOnce([]);
    expect(await geocode("nowhere")).toBeNull();
  });
});

describe("reverseGeocode", () => {
  it("returns the display_name for a coordinate", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ display_name: "South Perth Foreshore, WA" }) }),
    );
    expect(await reverseGeocode(-31.97, 115.86)).toBe("South Perth Foreshore, WA");
  });

  it("returns null when the response has no display_name", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    expect(await reverseGeocode(-31.97, 115.86)).toBeNull();
  });

  it("returns null on a non-OK response or network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await reverseGeocode(-31.97, 115.86)).toBeNull();
  });
});
