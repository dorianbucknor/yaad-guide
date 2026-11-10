import { describe, expect, it } from "vitest";

import type { PlaceRow } from "@/lib/move/queries";

import { ALL_ISLAND, coverageRows, pickPlace, removePlace, sameCoverage } from "./coverage-draft";

const place = (id: string, name: string, parish: string): PlaceRow => ({ id, slug: id, name, kind: "town", parish, lat: 18, lng: -77 });
const places = [place("a", "Negril", "Westmoreland"), place("b", "Ocho Rios", "St. Ann"), place("c", "Kingston", "Kingston")];

describe("pickPlace", () => {
  it("adds a place once", () => {
    const once = pickPlace({ allIsland: false, placeIds: [] }, "a");
    expect(pickPlace(once, "a").placeIds).toEqual(["a"]);
  });
  it("sets the island-wide flag when All Island is chosen and keeps the places", () => {
    expect(pickPlace({ allIsland: false, placeIds: ["a"] }, ALL_ISLAND)).toEqual({ allIsland: true, placeIds: ["a"] });
  });
  it("ignores a specific place while All Island is chosen", () => {
    expect(pickPlace({ allIsland: true, placeIds: [] }, "b").placeIds).toEqual([]);
  });
});

describe("removePlace", () => {
  it("clears the island-wide flag and brings the kept places back", () => {
    const draft = removePlace({ allIsland: true, placeIds: ["a"] }, ALL_ISLAND);
    expect(draft).toEqual({ allIsland: false, placeIds: ["a"] });
  });
  it("removes one place", () => {
    expect(removePlace({ allIsland: false, placeIds: ["a", "b"] }, "a").placeIds).toEqual(["b"]);
  });
});

describe("coverageRows", () => {
  it("shows only All Island when it is chosen", () => {
    expect(coverageRows({ allIsland: true, placeIds: ["a"] }, places)).toEqual([
      { id: ALL_ISLAND, name: "All Island", parish: "Every parish" },
    ]);
  });
  it("lists chosen places with their parish, by name", () => {
    expect(coverageRows({ allIsland: false, placeIds: ["b", "a"] }, places)).toEqual([
      { id: "a", name: "Negril", parish: "Westmoreland" },
      { id: "b", name: "Ocho Rios", parish: "St. Ann" },
    ]);
  });
  it("drops a chosen id that is no longer in the places list", () => {
    expect(coverageRows({ allIsland: false, placeIds: ["gone"] }, places)).toEqual([]);
  });
});

describe("sameCoverage", () => {
  it("ignores the order of places", () => {
    expect(sameCoverage({ allIsland: false, placeIds: ["a", "b"] }, { allIsland: false, placeIds: ["b", "a"] })).toBe(true);
  });
  it("notices a different flag or place", () => {
    expect(sameCoverage({ allIsland: true, placeIds: [] }, { allIsland: false, placeIds: [] })).toBe(false);
    expect(sameCoverage({ allIsland: false, placeIds: ["a"] }, { allIsland: false, placeIds: ["b"] })).toBe(false);
  });
});
