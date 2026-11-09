import { describe, expect, it } from "vitest";

import {
  PARISHES,
  addressSchema,
  closeDateSchema,
  isOwnVibePhotoPath,
  manualSlotSchema,
  policySchema,
  scheduleRuleSchema,
  scheduleSchema,
  slotEditSchema,
  ticketTypeSchema,
  vibeBasicsSchema,
  vibeBusinessSchema,
} from "./vibe";

const basics = {
  subtype: "attraction",
  title: "Blue Hole tour",
  description: "  A swim and a cliff jump  ",
  area: "Ocho Rios",
  currency: "usd",
  durationMinutes: 120,
};

describe("vibeBasicsSchema", () => {
  it("accepts good basics, trims text and defaults cutoff and policy", () => {
    const parsed = vibeBasicsSchema.parse(basics);
    expect(parsed.description).toBe("A swim and a cliff jump");
    expect(parsed.bookingCutoffMinutes).toBe(60);
    expect(parsed.cancellationPolicy).toBe("flexible");
  });

  it("accepts dining as a subtype alongside event and attraction", () => {
    for (const subtype of ["event", "attraction", "dining"]) {
      expect(vibeBasicsSchema.safeParse({ ...basics, subtype }).success).toBe(true);
    }
    expect(vibeBasicsSchema.safeParse({ ...basics, subtype: "spa" }).success).toBe(false);
  });

  it("rejects a cutoff outside 0 to 10080 minutes", () => {
    expect(vibeBasicsSchema.safeParse({ ...basics, bookingCutoffMinutes: 10081 }).success).toBe(false);
    expect(vibeBasicsSchema.safeParse({ ...basics, bookingCutoffMinutes: -1 }).success).toBe(false);
    expect(vibeBasicsSchema.safeParse({ ...basics, bookingCutoffMinutes: 0 }).success).toBe(true);
    expect(vibeBasicsSchema.safeParse({ ...basics, bookingCutoffMinutes: 10080 }).success).toBe(true);
  });

  it("rejects a short title, a bad duration and an unknown policy", () => {
    expect(vibeBasicsSchema.safeParse({ ...basics, title: "Hi" }).success).toBe(false);
    expect(vibeBasicsSchema.safeParse({ ...basics, durationMinutes: 5 }).success).toBe(false);
    expect(vibeBasicsSchema.safeParse({ ...basics, cancellationPolicy: "lenient" }).success).toBe(false);
  });
});

describe("policySchema", () => {
  it("accepts the three policies only", () => {
    expect(policySchema.safeParse({ cancellationPolicy: "strict" }).success).toBe(true);
    expect(policySchema.safeParse({ cancellationPolicy: "lenient" }).success).toBe(false);
  });
});

describe("addressSchema", () => {
  const address = {
    addressLine1: "1 Main Road",
    town: "Ocho Rios",
    parish: "St. Ann",
    latitude: 18.4,
    longitude: -77.1,
  };

  it("lists the 14 parishes", () => {
    expect(PARISHES).toHaveLength(14);
  });

  it("accepts a full address", () => {
    expect(addressSchema.safeParse(address).success).toBe(true);
  });

  it("rejects an unknown parish and a pin outside Jamaica", () => {
    expect(addressSchema.safeParse({ ...address, parish: "Nowhere" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...address, latitude: 40.7, longitude: -74 }).success).toBe(false);
  });

  it("needs the first address line and the town", () => {
    expect(addressSchema.safeParse({ ...address, addressLine1: " " }).success).toBe(false);
    expect(addressSchema.safeParse({ ...address, town: "" }).success).toBe(false);
  });
});

describe("ticketTypeSchema", () => {
  const paid = { name: "Adult", price: 20 };

  it("accepts a paid ticket with a discount", () => {
    expect(ticketTypeSchema.safeParse({ ...paid, discountPercent: 25 }).success).toBe(true);
  });

  it("rejects a free ticket without the confirmation", () => {
    const result = ticketTypeSchema.safeParse({ name: "Child", price: 0 });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toContain("confirm");
  });

  it("accepts a confirmed free ticket", () => {
    expect(ticketTypeSchema.safeParse({ name: "Child", price: 0, confirmFree: true }).success).toBe(true);
  });

  it("rejects a discount on a free ticket", () => {
    expect(ticketTypeSchema.safeParse({ name: "Child", price: 0, confirmFree: true, discountPercent: 10 }).success).toBe(false);
  });

  it("rejects discounts of 0 and 100 or more, and negative prices", () => {
    expect(ticketTypeSchema.safeParse({ ...paid, discountPercent: 0 }).success).toBe(false);
    expect(ticketTypeSchema.safeParse({ ...paid, discountPercent: 100 }).success).toBe(false);
    expect(ticketTypeSchema.safeParse({ name: "Adult", price: -1 }).success).toBe(false);
  });

  it("caps the description at 200 characters", () => {
    expect(ticketTypeSchema.safeParse({ ...paid, description: "x".repeat(200) }).success).toBe(true);
    expect(ticketTypeSchema.safeParse({ ...paid, description: "x".repeat(201) }).success).toBe(false);
  });
});

describe("schedule and slots", () => {
  const rule = { weekday: 2, startMinutes: 600, capacity: 40 };

  it("accepts a weekly rule and rejects bad weekday, time and capacity", () => {
    expect(scheduleRuleSchema.safeParse(rule).success).toBe(true);
    expect(scheduleRuleSchema.safeParse({ ...rule, weekday: 7 }).success).toBe(false);
    expect(scheduleRuleSchema.safeParse({ ...rule, startMinutes: 1440 }).success).toBe(false);
    expect(scheduleRuleSchema.safeParse({ ...rule, capacity: 0 }).success).toBe(false);
  });

  it("needs valid-from on or before valid-until", () => {
    expect(scheduleRuleSchema.safeParse({ ...rule, validFrom: "2026-12-01", validUntil: "2026-11-01" }).success).toBe(false);
    expect(scheduleRuleSchema.safeParse({ ...rule, validFrom: "2026-11-01", validUntil: "2026-12-01" }).success).toBe(true);
  });

  it("takes the auto-generation switch with the rules", () => {
    expect(scheduleSchema.safeParse({ autoGenerate: false, rules: [rule] }).success).toBe(true);
    expect(scheduleSchema.safeParse({ rules: [rule] }).success).toBe(false);
  });

  it("accepts a slot in the future and rejects one in the past", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(manualSlotSchema.safeParse({ startsAt: future, capacity: 10 }).success).toBe(true);
    expect(manualSlotSchema.safeParse({ startsAt: past, capacity: 10 }).success).toBe(false);
    expect(manualSlotSchema.safeParse({ startsAt: future, capacity: 0 }).success).toBe(false);
  });

  it("validates a slot edit and a date closing", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(slotEditSchema.safeParse({ id, capacity: 5, status: "closed" }).success).toBe(true);
    expect(slotEditSchema.safeParse({ id, capacity: 5, status: "gone" }).success).toBe(false);
    expect(closeDateSchema.safeParse({ day: "2026-11-20", closed: true }).success).toBe(true);
    expect(closeDateSchema.safeParse({ day: "2026-13-40", closed: true }).success).toBe(false);
    expect(closeDateSchema.safeParse({ day: "20/11/2026", closed: true }).success).toBe(false);
  });
});

describe("vibeBusinessSchema", () => {
  it("allows a missing business name and needs a region", () => {
    expect(vibeBusinessSchema.safeParse({ primaryRegion: "Kingston" }).success).toBe(true);
    expect(vibeBusinessSchema.safeParse({ businessName: "Rapids Co", primaryRegion: "" }).success).toBe(false);
  });
});

describe("isOwnVibePhotoPath", () => {
  it("accepts a file in the listing folder", () => {
    expect(isOwnVibePhotoPath("u1/vibe/l1/a.jpg", "u1", "l1")).toBe(true);
    expect(isOwnVibePhotoPath("u1/vibe/l1/A-b_2.webp", "u1", "l1")).toBe(true);
  });

  it("rejects dot segments, other users, other listings and other file types", () => {
    expect(isOwnVibePhotoPath("u1/vibe/l1/../x.jpg", "u1", "l1")).toBe(false);
    expect(isOwnVibePhotoPath("u2/vibe/l1/a.jpg", "u1", "l1")).toBe(false);
    expect(isOwnVibePhotoPath("u1/vibe/l2/a.jpg", "u1", "l1")).toBe(false);
    expect(isOwnVibePhotoPath("u1/vibe/l1/a.exe", "u1", "l1")).toBe(false);
    expect(isOwnVibePhotoPath("u1/l1/a.jpg", "u1", "l1")).toBe(false);
  });
});
