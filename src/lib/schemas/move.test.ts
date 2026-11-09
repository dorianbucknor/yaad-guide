import { describe, expect, it } from "vitest";

import {
  availabilitySchema,
  blockedRangeSchema,
  flatRateSchema,
  isOwnPhotoPath,
  listingSchema,
  luggageSchema,
  placeSuggestionSchema,
} from "./move";

const uuidA = "00000000-0000-4000-8000-00000000000a";
const uuidB = "00000000-0000-4000-8000-00000000000b";

describe("listingSchema", () => {
  const ok = { currency: "usd", islandWide: false, baseFare: 10, perKm: 1.5, hourlyRate: 25, description: "Airport transfers" };

  it("accepts a normal listing", () => {
    expect(listingSchema.safeParse(ok).success).toBe(true);
  });

  it("rejects a negative price", () => {
    expect(listingSchema.safeParse({ ...ok, baseFare: -1 }).success).toBe(false);
  });

  it("rejects a description over 500 characters", () => {
    expect(listingSchema.safeParse({ ...ok, description: "x".repeat(501) }).success).toBe(false);
  });

  it("turns a blank description into null", () => {
    const parsed = listingSchema.parse({ ...ok, description: "   " });
    expect(parsed.description).toBeNull();
  });

  it("allows empty formula fields", () => {
    expect(listingSchema.safeParse({ ...ok, baseFare: null, perKm: null, hourlyRate: null }).success).toBe(true);
  });
});

describe("flatRateSchema", () => {
  it("needs two different places and a positive price", () => {
    expect(flatRateSchema.safeParse({ placeAId: uuidA, placeBId: uuidB, price: 80 }).success).toBe(true);
    expect(flatRateSchema.safeParse({ placeAId: uuidA, placeBId: uuidA, price: 80 }).success).toBe(false);
    expect(flatRateSchema.safeParse({ placeAId: uuidA, placeBId: uuidB, price: 0 }).success).toBe(false);
  });
});

describe("availabilitySchema", () => {
  it("rejects a window that ends before it starts", () => {
    const bad = { windows: [{ weekday: 1, startMinutes: 600, endMinutes: 500 }] };
    expect(availabilitySchema.safeParse(bad).success).toBe(false);
  });

  it("rejects weekday 7", () => {
    const bad = { windows: [{ weekday: 7, startMinutes: 480, endMinutes: 1080 }] };
    expect(availabilitySchema.safeParse(bad).success).toBe(false);
  });

  it("accepts a window ending at midnight", () => {
    const ok = { windows: [{ weekday: 1, startMinutes: 480, endMinutes: 1440 }] };
    expect(availabilitySchema.safeParse(ok).success).toBe(true);
  });
});

describe("blockedRangeSchema", () => {
  it("rejects an end before the start", () => {
    expect(blockedRangeSchema.safeParse({ startsAt: "2026-12-20T05:00:00Z", endsAt: "2026-12-19T05:00:00Z" }).success).toBe(false);
  });

  it("accepts a multi-day range", () => {
    expect(blockedRangeSchema.safeParse({ startsAt: "2026-12-20T05:00:00Z", endsAt: "2026-12-27T05:00:00Z" }).success).toBe(true);
  });
});

describe("luggageSchema", () => {
  it("rejects more than 20", () => {
    expect(luggageSchema.safeParse({ vehicleId: uuidA, large: 21, carryOn: 0 }).success).toBe(false);
    expect(luggageSchema.safeParse({ vehicleId: uuidA, large: 3, carryOn: 2 }).success).toBe(true);
  });
});

describe("placeSuggestionSchema", () => {
  it("needs a name of 2 to 80 characters", () => {
    expect(placeSuggestionSchema.safeParse({ name: "R" }).success).toBe(false);
    expect(placeSuggestionSchema.safeParse({ name: "Robins Bay", note: "Near Port Maria" }).success).toBe(true);
  });
});

describe("isOwnPhotoPath", () => {
  const user = "11111111-1111-4111-8111-111111111111";
  const vehicle = "22222222-2222-4222-8222-222222222222";

  it("accepts a file in the user's own vehicle folder", () => {
    expect(isOwnPhotoPath(`${user}/${vehicle}/front.jpg`, user, vehicle)).toBe(true);
  });

  it("rejects another user's folder, another vehicle and traversal", () => {
    expect(isOwnPhotoPath(`other/${vehicle}/front.jpg`, user, vehicle)).toBe(false);
    expect(isOwnPhotoPath(`${user}/other/front.jpg`, user, vehicle)).toBe(false);
    expect(isOwnPhotoPath(`${user}/${vehicle}/../x.jpg`, user, vehicle)).toBe(false);
    expect(isOwnPhotoPath(`${user}/${vehicle}/front.gif`, user, vehicle)).toBe(false);
  });
});
