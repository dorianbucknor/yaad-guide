import { describe, expect, it } from "vitest";

import type { DiningProfile } from "@/lib/vibe/types";

import { diningTabsFor } from "./dining-listing-tab-names";

const profile = (over: Partial<DiningProfile>): DiningProfile => ({
  venueType: "restaurant",
  dineIn: true,
  takeout: false,
  cuisineTypes: [],
  priceTier: null,
  bookingMode: "listing_only",
  reservationStyle: null,
  ...over,
});

describe("diningTabsFor", () => {
  it("shows only the always-needed tabs before details are saved", () => {
    expect(diningTabsFor(null)).toEqual(["basics", "details", "location", "photos"]);
  });
  it("adds nothing for a listing-only venue", () => {
    expect(diningTabsFor(profile({}))).toEqual(["basics", "details", "location", "photos"]);
  });
  it("adds tickets, schedule and cancellation for prepaid", () => {
    expect(diningTabsFor(profile({ bookingMode: "prepaid" }))).toEqual([
      "basics", "details", "tickets", "schedule", "location", "photos", "policy",
    ]);
  });
  it("adds schedule and cancellation for slotted reservations", () => {
    expect(diningTabsFor(profile({ bookingMode: "reservation", reservationStyle: "slotted" }))).toEqual([
      "basics", "details", "schedule", "location", "photos", "policy",
    ]);
  });
  it("adds hours for hours-only reservations", () => {
    expect(diningTabsFor(profile({ bookingMode: "reservation", reservationStyle: "hours_only" }))).toEqual([
      "basics", "details", "hours", "location", "photos",
    ]);
  });
});
