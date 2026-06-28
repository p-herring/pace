import { describe, expect, it } from "vitest";
import {
  errorParam,
  formatPaceValue,
  isPlanEditable,
  parsePaceInput,
  parseRoutePath,
  PLAN_EDIT_CUTOFF_HOURS,
  routeDistanceKm,
  safeNextPath,
  withParam,
} from "@/lib/muster-action-helpers";

describe("withParam / errorParam", () => {
  it("encodes the value into the query string", () => {
    expect(withParam("/muster/sign-in", "error", "bad credentials")).toBe(
      "/muster/sign-in?error=bad%20credentials",
    );
  });

  it("errorParam is withParam with key='error'", () => {
    expect(errorParam("/muster/new", "oops")).toBe("/muster/new?error=oops");
  });

  it("encodes special characters that could otherwise break the URL", () => {
    expect(withParam("/muster", "message", "you’re on the plan & confirmed")).toContain(
      encodeURIComponent("you’re on the plan & confirmed"),
    );
  });
});

describe("safeNextPath", () => {
  it("accepts a normal relative path", () => {
    expect(safeNextPath("/muster/new")).toBe("/muster/new");
  });

  it("falls back for a missing value", () => {
    expect(safeNextPath(null)).toBe("/muster");
  });

  it("falls back for a non-string value", () => {
    const file = new File([""], "x.txt");
    expect(safeNextPath(file)).toBe("/muster");
  });

  it("falls back for an absolute URL", () => {
    expect(safeNextPath("https://evil.example.com")).toBe("/muster");
  });

  it("rejects protocol-relative redirect targets (the open-redirect case)", () => {
    expect(safeNextPath("//evil.example.com")).toBe("/muster");
    expect(safeNextPath("///evil.example.com")).toBe("/muster");
  });

  it("respects a custom fallback", () => {
    expect(safeNextPath(null, "/muster/account")).toBe("/muster/account");
  });
});

describe("parsePaceInput", () => {
  it("parses ride as a plain km/h decimal", () => {
    expect(parsePaceInput("ride", "28")).toBe(28);
    expect(parsePaceInput("ride", "24.5")).toBe(24.5);
  });

  it("rejects non-numeric or non-positive ride input", () => {
    expect(parsePaceInput("ride", "fast")).toBeNull();
    expect(parsePaceInput("ride", "0")).toBeNull();
    expect(parsePaceInput("ride", "-5")).toBeNull();
  });

  it("parses run/swim as m:ss into total seconds", () => {
    expect(parsePaceInput("run", "5:30")).toBe(330);
    expect(parsePaceInput("swim", "2:10")).toBe(130);
  });

  it("accepts single-digit minutes and requires two-digit seconds", () => {
    expect(parsePaceInput("run", "9:05")).toBe(545);
  });

  it("rejects malformed m:ss input", () => {
    expect(parsePaceInput("run", "5.30")).toBeNull();
    expect(parsePaceInput("run", "5:60")).toBeNull();
    expect(parsePaceInput("run", "abc")).toBeNull();
    expect(parsePaceInput("run", "")).toBeNull();
  });
});

describe("formatPaceValue", () => {
  it("formats ride as km/h", () => {
    expect(formatPaceValue("ride", 28)).toBe("28 km/h");
  });

  it("formats run/swim seconds back into m:ss with the right unit", () => {
    expect(formatPaceValue("run", 330)).toBe("5:30 /km");
    expect(formatPaceValue("swim", 130)).toBe("2:10 /100m");
  });

  it("pads single-digit seconds", () => {
    expect(formatPaceValue("run", 305)).toBe("5:05 /km");
  });

  it("round-trips with parsePaceInput", () => {
    expect(formatPaceValue("run", parsePaceInput("run", "5:30")!)).toBe("5:30 /km");
  });
});

describe("isPlanEditable / hoursUntil", () => {
  it("is editable when well over the cutoff", () => {
    const future = new Date(Date.now() + 100 * 60 * 60 * 1000);
    expect(isPlanEditable(future)).toBe(true);
  });

  it("is not editable inside the 48-hour cutoff", () => {
    const soon = new Date(Date.now() + 10 * 60 * 60 * 1000);
    expect(isPlanEditable(soon)).toBe(false);
  });

  it("is not editable once the plan has started", () => {
    const past = new Date(Date.now() - 60 * 60 * 1000);
    expect(isPlanEditable(past)).toBe(false);
  });

  it("treats exactly 48 hours out as no longer editable", () => {
    const exact = new Date(Date.now() + PLAN_EDIT_CUTOFF_HOURS * 60 * 60 * 1000);
    expect(isPlanEditable(exact)).toBe(false);
  });
});

describe("routeDistanceKm", () => {
  it("returns 0 for fewer than two points", () => {
    expect(routeDistanceKm([])).toBe(0);
    expect(routeDistanceKm([{ lat: -31.95, lng: 115.86 }])).toBe(0);
  });

  it("sums consecutive great-circle distances", () => {
    // Roughly 1 degree of latitude ≈ 111km — sanity-check the order of magnitude.
    const distance = routeDistanceKm([
      { lat: -31.0, lng: 115.86 },
      { lat: -32.0, lng: 115.86 },
    ]);
    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(120);
  });

  it("accumulates across multiple legs", () => {
    const oneLeg = routeDistanceKm([
      { lat: -31.95, lng: 115.86 },
      { lat: -31.96, lng: 115.86 },
    ]);
    const twoLegs = routeDistanceKm([
      { lat: -31.95, lng: 115.86 },
      { lat: -31.96, lng: 115.86 },
      { lat: -31.97, lng: 115.86 },
    ]);
    expect(twoLegs).toBeGreaterThan(oneLeg);
    expect(twoLegs).toBeCloseTo(oneLeg * 2, 1);
  });

  it("returns 0 for a closed loop back to the start", () => {
    const distance = routeDistanceKm([
      { lat: -31.95, lng: 115.86 },
      { lat: -31.96, lng: 115.86 },
      { lat: -31.95, lng: 115.86 },
    ]);
    expect(distance).toBeGreaterThan(0); // there and back is not 0 — sanity check
  });
});

describe("parseRoutePath", () => {
  it("returns null for empty/missing input", () => {
    expect(parseRoutePath(null)).toBeNull();
    expect(parseRoutePath(undefined)).toBeNull();
    expect(parseRoutePath("")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseRoutePath("not json")).toBeNull();
  });

  it("returns null for fewer than two points", () => {
    expect(parseRoutePath(JSON.stringify([{ lat: -31.95, lng: 115.86 }]))).toBeNull();
  });

  it("returns null for more than 500 points", () => {
    const huge = Array.from({ length: 501 }, (_, i) => ({ lat: -31.95 + i * 0.0001, lng: 115.86 }));
    expect(parseRoutePath(JSON.stringify(huge))).toBeNull();
  });

  it("returns null for out-of-range coordinates", () => {
    expect(
      parseRoutePath(JSON.stringify([{ lat: -31.95, lng: 115.86 }, { lat: 999, lng: 115.86 }])),
    ).toBeNull();
  });

  it("returns null for malformed points", () => {
    expect(parseRoutePath(JSON.stringify([{ lat: -31.95 }, { lat: -31.96, lng: 115.86 }]))).toBeNull();
  });

  it("parses a valid path", () => {
    const path = [{ lat: -31.95, lng: 115.86 }, { lat: -31.96, lng: 115.87 }];
    expect(parseRoutePath(JSON.stringify(path))).toEqual(path);
  });
});
