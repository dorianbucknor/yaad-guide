import { describe, expect, it } from "vitest";

import { CUISINE_MAX, businessHoursRowSchema, businessHoursSetSchema, diningDetailsSchema } from "./dining";

const base = { venueType: "cookshop", bookingMode: "listing_only" };

describe("diningDetailsSchema", () => {
  it("accepts a plain cookshop and fills the defaults", () => {
    const parsed = diningDetailsSchema.parse(base);
    expect(parsed).toMatchObject({
      venueType: "cookshop",
      dineIn: false,
      takeout: false,
      cuisineTypes: [],
      priceTier: null,
      bookingMode: "listing_only",
      reservationStyle: null,
    });
  });

  it("rejects an unknown venue type, booking mode or price tier", () => {
    expect(diningDetailsSchema.safeParse({ ...base, venueType: "bar" }).success).toBe(false);
    expect(diningDetailsSchema.safeParse({ ...base, bookingMode: "walk_in" }).success).toBe(false);
    expect(diningDetailsSchema.safeParse({ ...base, priceTier: "$$$$" }).success).toBe(false);
    expect(diningDetailsSchema.safeParse({ ...base, priceTier: "$$" }).success).toBe(true);
  });

  it("asks a restaurant for dine-in or takeout, and says so on the dine-in field", () => {
    const result = diningDetailsSchema.safeParse({ ...base, venueType: "restaurant" });
    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues.some((i) => i.path[0] === "dineIn")).toBe(true);
    expect(diningDetailsSchema.safeParse({ ...base, venueType: "restaurant", takeout: true }).success).toBe(true);
    expect(diningDetailsSchema.safeParse({ ...base, venueType: "restaurant", dineIn: true }).success).toBe(true);
  });

  it("does not ask a cookshop or street food stall for a service mode", () => {
    expect(diningDetailsSchema.safeParse({ ...base, venueType: "street_food" }).success).toBe(true);
  });

  it("needs a reservation style exactly when the mode is reservation", () => {
    const missingStyle = diningDetailsSchema.safeParse({ ...base, bookingMode: "reservation" });
    expect(missingStyle.success).toBe(false);
    expect(!missingStyle.success && missingStyle.error.issues.some((i) => i.path[0] === "reservationStyle")).toBe(true);
    expect(diningDetailsSchema.safeParse({ ...base, bookingMode: "reservation", reservationStyle: "slotted" }).success).toBe(true);
    expect(diningDetailsSchema.safeParse({ ...base, bookingMode: "reservation", reservationStyle: "hours_only" }).success).toBe(true);
    expect(diningDetailsSchema.safeParse({ ...base, bookingMode: "prepaid", reservationStyle: "slotted" }).success).toBe(false);
    expect(diningDetailsSchema.safeParse({ ...base, bookingMode: "listing_only", reservationStyle: "slotted" }).success).toBe(false);
  });

  describe("cuisine types", () => {
    const cuisines = (cuisineTypes: string[]) => diningDetailsSchema.safeParse({ ...base, cuisineTypes });

    it("trims each entry, drops blanks, and drops repeats whatever their case", () => {
      const result = cuisines([" Jerk ", "", "   ", "jerk", "Seafood"]);
      expect(result.success && result.data.cuisineTypes).toEqual(["Jerk", "Seafood"]);
    });

    it(`allows up to ${CUISINE_MAX} and rejects more`, () => {
      const names = Array.from({ length: CUISINE_MAX + 1 }, (_, i) => `Cuisine ${i}`);
      expect(cuisines(names.slice(0, CUISINE_MAX)).success).toBe(true);
      expect(cuisines(names).success).toBe(false);
    });

    it("counts only the entries that remain after blanks and repeats are dropped", () => {
      const names = [...Array.from({ length: CUISINE_MAX }, (_, i) => `Cuisine ${i}`), "", "cuisine 0"];
      expect(cuisines(names).success).toBe(true);
    });

    it("rejects an entry over 40 characters", () => {
      expect(cuisines(["x".repeat(41)]).success).toBe(false);
      expect(cuisines(["x".repeat(40)]).success).toBe(true);
    });
  });
});

describe("businessHoursRowSchema", () => {
  const row = { weekday: 1, opensMinutes: 540, closesMinutes: 1260 };

  it("accepts a day's hours", () => {
    expect(businessHoursRowSchema.safeParse(row).success).toBe(true);
  });

  it("rejects closing at or before opening, with a message that mentions midnight", () => {
    const same = businessHoursRowSchema.safeParse({ ...row, closesMinutes: 540 });
    expect(same.success).toBe(false);
    const overnight = businessHoursRowSchema.safeParse({ ...row, opensMinutes: 1080, closesMinutes: 120 });
    expect(overnight.success).toBe(false);
    expect(!overnight.success && overnight.error.issues[0].message).toMatch(/midnight/i);
    expect(!overnight.success && overnight.error.issues[0].path).toEqual(["closesMinutes"]);
  });

  it("rejects a bad weekday or minute", () => {
    expect(businessHoursRowSchema.safeParse({ ...row, weekday: 7 }).success).toBe(false);
    expect(businessHoursRowSchema.safeParse({ ...row, opensMinutes: 1440 }).success).toBe(false);
    expect(businessHoursRowSchema.safeParse({ ...row, closesMinutes: 1440 }).success).toBe(false);
    expect(businessHoursRowSchema.safeParse({ ...row, opensMinutes: -1 }).success).toBe(false);
  });
});

describe("businessHoursSetSchema", () => {
  const day = (weekday: number) => ({ weekday, opensMinutes: 540, closesMinutes: 1260 });

  it("accepts a full week, and an empty one (closed every day)", () => {
    expect(businessHoursSetSchema.safeParse([0, 1, 2, 3, 4, 5, 6].map(day)).success).toBe(true);
    expect(businessHoursSetSchema.safeParse([]).success).toBe(true);
  });

  it("rejects two rows for the same weekday", () => {
    expect(businessHoursSetSchema.safeParse([day(0), day(0)]).success).toBe(false);
  });

  it("rejects more than seven rows", () => {
    expect(businessHoursSetSchema.safeParse([0, 1, 2, 3, 4, 5, 6, 0].map(day)).success).toBe(false);
  });

  it("passes a row's own error up", () => {
    expect(businessHoursSetSchema.safeParse([{ weekday: 1, opensMinutes: 600, closesMinutes: 600 }]).success).toBe(false);
  });
});
