import { describe, expect, it } from "vitest";

import { readiness, type ReadinessInput } from "./readiness";

const ready: ReadinessInput = {
  profileApproved: true,
  vehicle: { luggageLarge: 3, luggageCarryOn: 2, photoKinds: ["front", "rear", "interior", "luggage"] },
  profilePhotoVerified: true,
  islandWide: false,
  placeCount: 2,
  flatRateCount: 1,
  distancePricingEnabled: true,
  baseFare: null,
  perKm: null,
  windowCount: 5,
};

describe("readiness", () => {
  it("is ready when everything is in place", () => {
    expect(readiness(ready)).toEqual({ ready: true, missing: [] });
  });

  it("lists exactly the missing items", () => {
    const result = readiness({
      ...ready,
      profileApproved: false,
      vehicle: { luggageLarge: 0, luggageCarryOn: 0, photoKinds: ["front", "interior"] },
      profilePhotoVerified: false,
      placeCount: 0,
      flatRateCount: 0,
      windowCount: 0,
    });
    expect(result.ready).toBe(false);
    expect(result.missing).toEqual([
      "profile_approved",
      "luggage",
      "photos",
      "profile_photo",
      "coverage",
      "pricing",
      "availability",
    ]);
  });

  it("asks for a vehicle when none is active", () => {
    expect(readiness({ ...ready, vehicle: null }).missing).toEqual(["vehicle"]);
  });

  it("accepts island-wide coverage with no places", () => {
    expect(readiness({ ...ready, islandWide: true, placeCount: 0 }).ready).toBe(true);
  });

  it("accepts a formula in place of flat rates but not half a formula", () => {
    expect(readiness({ ...ready, flatRateCount: 0, baseFare: 10, perKm: 1.5 }).ready).toBe(true);
    expect(readiness({ ...ready, flatRateCount: 0, baseFare: 10, perKm: null }).missing).toEqual(["pricing"]);
  });

  it("does not count a formula that is switched off", () => {
    expect(readiness({ ...ready, flatRateCount: 0, baseFare: 10, perKm: 1.5, distancePricingEnabled: false }).missing).toEqual(["pricing"]);
    expect(readiness({ ...ready, flatRateCount: 1, baseFare: 10, perKm: 1.5, distancePricingEnabled: false }).ready).toBe(true);
  });
});
