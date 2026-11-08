import { describe, expect, it } from "vitest";

import { estimateRoute, haversineKm } from "./distance";

const montegoBay = { lat: 18.4762, lng: -77.8939 };
const negril = { lat: 18.2683, lng: -78.3478 };

describe("haversineKm", () => {
  it("measures Montego Bay to Negril as about 50 km in a straight line", () => {
    const km = haversineKm(montegoBay, negril);
    expect(km).toBeGreaterThan(45);
    expect(km).toBeLessThan(60);
  });

  it("is zero from a point to itself", () => {
    expect(haversineKm(montegoBay, montegoBay)).toBe(0);
  });
});

describe("estimateRoute", () => {
  it("multiplies the straight-line distance by the road circuity", () => {
    const straight = haversineKm(montegoBay, negril);
    const route = estimateRoute(montegoBay, negril);
    expect(route.km).toBeCloseTo(straight * 1.4, 1);
  });

  it("rounds minutes up from the average speed", () => {
    const route = estimateRoute(montegoBay, negril);
    expect(route.minutes).toBe(Math.ceil((route.km / 45) * 60));
  });
});
