import { describe, expect, it } from "vitest";

import { BOOKING_MODES, PRICE_TIERS, RESERVATION_STYLES, VENUE_TYPES, diningReadiness, type DiningReadinessInput } from "./dining";

const shared = {
  profileApproved: true,
  description: "Good food",
  area: "Kingston",
  addressLine1: "1 Main Road",
  town: "Kingston",
  parish: "Kingston",
  latitude: 18.0,
  longitude: -76.8,
  hasCoverPhoto: true,
};

const profile = (over: Partial<NonNullable<DiningReadinessInput["profile"]>> = {}): NonNullable<DiningReadinessInput["profile"]> => ({
  venueType: "cookshop",
  dineIn: true,
  takeout: false,
  bookingMode: "listing_only",
  reservationStyle: null,
  ticketCount: 0,
  futureOpenSlotCount: 0,
  ruleCount: 0,
  autoGenerate: true,
  businessHoursCount: 0,
  ...over,
});

describe("constants", () => {
  it("lists the choices the editor offers", () => {
    expect(VENUE_TYPES).toEqual(["street_food", "cookshop", "restaurant"]);
    expect(BOOKING_MODES).toEqual(["reservation", "prepaid", "listing_only"]);
    expect(RESERVATION_STYLES).toEqual(["slotted", "hours_only"]);
    expect(PRICE_TIERS).toEqual(["$", "$$", "$$$"]);
  });
});

describe("diningReadiness", () => {
  it("asks for the venue type when there are no dining details, and nothing mode-specific", () => {
    const result = diningReadiness({ ...shared, profile: null });
    expect(result.ready).toBe(false);
    expect(result.missing).toEqual(["venue_type"]);
  });

  it("also reports the shared items that are missing", () => {
    const result = diningReadiness({ ...shared, profileApproved: false, description: " ", addressLine1: null, latitude: null, hasCoverPhoto: false, profile: null });
    expect(result.missing).toEqual(["profile_approved", "basics", "address", "pin", "cover_photo", "venue_type"]);
  });

  it("asks a restaurant for dine-in or takeout", () => {
    const missing = diningReadiness({ ...shared, profile: profile({ venueType: "restaurant", dineIn: false, takeout: false }) }).missing;
    expect(missing).toEqual(["service_mode"]);
    expect(diningReadiness({ ...shared, profile: profile({ venueType: "restaurant", dineIn: false, takeout: true }) }).ready).toBe(true);
  });

  it("does not ask a cookshop or street food stall for a service mode", () => {
    expect(diningReadiness({ ...shared, profile: profile({ venueType: "street_food", dineIn: false, takeout: false }) }).ready).toBe(true);
  });

  it("is ready for listing only once the shared items are in", () => {
    expect(diningReadiness({ ...shared, profile: profile({ bookingMode: "listing_only" }) })).toEqual({ ready: true, missing: [] });
  });

  it("asks prepaid for tickets and slots independently", () => {
    const prepaid = (over = {}) => diningReadiness({ ...shared, profile: profile({ bookingMode: "prepaid", ...over }) }).missing;
    expect(prepaid()).toEqual(["tickets", "slots"]);
    expect(prepaid({ ticketCount: 1 })).toEqual(["slots"]);
    expect(prepaid({ futureOpenSlotCount: 2 })).toEqual(["tickets"]);
    expect(prepaid({ ticketCount: 1, futureOpenSlotCount: 2 })).toEqual([]);
  });

  it("counts a weekly schedule as slots only while automatic creation is on", () => {
    const prepaid = (over = {}) => diningReadiness({ ...shared, profile: profile({ bookingMode: "prepaid", ticketCount: 1, ...over }) }).missing;
    expect(prepaid({ ruleCount: 2, autoGenerate: true })).toEqual([]);
    expect(prepaid({ ruleCount: 2, autoGenerate: false })).toEqual(["slots"]);
  });

  it("asks slotted reservations for slots only, never tickets", () => {
    const slotted = (over = {}) => diningReadiness({ ...shared, profile: profile({ bookingMode: "reservation", reservationStyle: "slotted", ...over }) }).missing;
    expect(slotted()).toEqual(["slots"]);
    expect(slotted({ futureOpenSlotCount: 1 })).toEqual([]);
  });

  it("asks reservations on opening hours for hours, and a slot does not stand in", () => {
    const hours = (over = {}) => diningReadiness({ ...shared, profile: profile({ bookingMode: "reservation", reservationStyle: "hours_only", ...over }) }).missing;
    expect(hours()).toEqual(["hours"]);
    expect(hours({ futureOpenSlotCount: 3 })).toEqual(["hours"]);
    expect(hours({ businessHoursCount: 1 })).toEqual([]);
  });
});
