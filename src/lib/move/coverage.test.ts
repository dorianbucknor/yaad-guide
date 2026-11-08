import { describe, expect, it } from "vitest";

import { covers, coversItinerary } from "./coverage";

const listing = { islandWide: false, placeIds: ["mbj", "negril"] };

describe("covers", () => {
  it("is true when both places are covered", () => {
    expect(covers(listing, "mbj", "negril")).toBe(true);
  });

  it("is false when either place is missing", () => {
    expect(covers(listing, "mbj", "kingston")).toBe(false);
    expect(covers(listing, "kingston", "negril")).toBe(false);
  });

  it("is true for any place when the listing is island-wide", () => {
    expect(covers({ islandWide: true, placeIds: [] }, "kingston", "port-antonio")).toBe(true);
  });

  it("is false for a place that is not on the list at all", () => {
    expect(covers(listing, "mbj", "")).toBe(false);
  });
});

describe("coversItinerary", () => {
  it("needs every leg covered", () => {
    const legs = [
      { fromId: "mbj", toId: "negril" },
      { fromId: "negril", toId: "kingston" },
    ];
    expect(coversItinerary(listing, legs)).toBe(false);
    expect(coversItinerary(listing, legs.slice(0, 1))).toBe(true);
  });

  it("is false for an itinerary with no legs", () => {
    expect(coversItinerary(listing, [])).toBe(false);
  });
});
