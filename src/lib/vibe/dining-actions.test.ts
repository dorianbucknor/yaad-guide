import { beforeEach, describe, expect, it, vi } from "vitest";

type Result = { data?: unknown; error?: { message: string; code?: string } | null };

const state = vi.hoisted(() => ({
  user: { id: "u1", app_metadata: {} } as { id: string; app_metadata: Record<string, unknown> } | null,
  results: {} as Record<string, Result>,
  calls: [] as string[],
  payloads: {} as Record<string, unknown>,
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      let op = "select";
      const result = (): Result => state.results[`${table}.${op}`] ?? { data: null, error: null };
      const record = (name: string, payload?: unknown) => {
        op = name;
        state.calls.push(`${table}.${name}`);
        if (payload !== undefined) state.payloads[`${table}.${name}`] = payload;
        return builder;
      };
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        limit: () => builder,
        insert: (payload: unknown) => record("insert", payload),
        upsert: (payload: unknown) => record("upsert", payload),
        update: (payload: unknown) => record("update", payload),
        delete: () => record("delete"),
        maybeSingle: async () => result(),
        single: async () => result(),
        then: (resolve: (value: Result) => unknown) => Promise.resolve(result()).then(resolve),
      };
      return builder;
    },
  }),
}));

import { saveBusinessHoursAction, saveDiningDetailsAction } from "./dining-actions";

const LISTING = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  state.user = { id: "u1", app_metadata: {} };
  state.results = { "vibe_listings.select": { data: { id: LISTING } } };
  state.calls = [];
  state.payloads = {};
});

const cookshop = { venueType: "cookshop", bookingMode: "listing_only" };

describe("saveDiningDetailsAction", () => {
  it("asks a signed-out caller to sign in", async () => {
    state.user = null;
    const result = await saveDiningDetailsAction(LISTING, cookshop);
    expect(result).toEqual({ ok: false, error: "Please sign in again to continue." });
    expect(state.calls).toEqual([]);
  });

  it("does not touch a listing the caller cannot see", async () => {
    state.results["vibe_listings.select"] = { data: null };
    const result = await saveDiningDetailsAction(LISTING, cookshop);
    expect(result).toEqual({ ok: false, error: "We couldn't find that." });
    expect(state.calls.filter((c) => c.startsWith("vibe_dining_profiles"))).toEqual([]);
  });

  it("rejects a restaurant with no dine-in or takeout before writing anything", async () => {
    const result = await saveDiningDetailsAction(LISTING, { venueType: "restaurant", bookingMode: "listing_only" });
    expect(result.ok).toBe(false);
    expect(state.calls.filter((c) => c.startsWith("vibe_dining_profiles"))).toEqual([]);
  });

  it("inserts the details the first time, with the listing id and mapped columns", async () => {
    state.results["vibe_dining_profiles.select"] = { data: null };
    const result = await saveDiningDetailsAction(LISTING, {
      venueType: "restaurant",
      dineIn: true,
      cuisineTypes: [" Jerk ", "jerk", "Seafood"],
      priceTier: "$$",
      bookingMode: "reservation",
      reservationStyle: "slotted",
    });
    expect(result.ok).toBe(true);
    expect(state.calls).toContain("vibe_dining_profiles.insert");
    expect(state.calls).not.toContain("vibe_dining_profiles.upsert");
    expect(state.payloads["vibe_dining_profiles.insert"]).toEqual({
      listing_id: LISTING,
      venue_type: "restaurant",
      dine_in: true,
      takeout: false,
      cuisine_types: ["Jerk", "Seafood"],
      price_tier: "$$",
      booking_mode: "reservation",
      reservation_style: "slotted",
    });
  });

  it("updates the details after that, and never sends the listing id", async () => {
    state.results["vibe_dining_profiles.select"] = { data: { listing_id: LISTING } };
    const result = await saveDiningDetailsAction(LISTING, cookshop);
    expect(result.ok).toBe(true);
    expect(state.calls).toContain("vibe_dining_profiles.update");
    expect(state.calls).not.toContain("vibe_dining_profiles.insert");
    expect(state.payloads["vibe_dining_profiles.update"]).not.toHaveProperty("listing_id");
  });

  it("shows the database's message when the booking mode is locked", async () => {
    state.results["vibe_dining_profiles.select"] = { data: { listing_id: LISTING } };
    state.results["vibe_dining_profiles.update"] = {
      error: { message: "The booking mode can't be changed after it's set. Create a new listing instead.", code: "P0001" },
    };
    const result = await saveDiningDetailsAction(LISTING, { venueType: "cookshop", bookingMode: "prepaid" });
    expect(result).toEqual({ ok: false, error: "The booking mode can't be changed after it's set. Create a new listing instead." });
  });
});

describe("saveBusinessHoursAction", () => {
  const week = [
    { weekday: 1, opensMinutes: 540, closesMinutes: 1260 },
    { weekday: 2, opensMinutes: 600, closesMinutes: 1200 },
  ];

  it("replaces the whole week: deletes the old rows, then inserts the new ones", async () => {
    const result = await saveBusinessHoursAction(LISTING, week);
    expect(result.ok).toBe(true);
    expect(state.calls.indexOf("vibe_business_hours.delete")).toBeLessThan(state.calls.indexOf("vibe_business_hours.insert"));
    expect(state.payloads["vibe_business_hours.insert"]).toEqual([
      { listing_id: LISTING, weekday: 1, opens_minutes: 540, closes_minutes: 1260 },
      { listing_id: LISTING, weekday: 2, opens_minutes: 600, closes_minutes: 1200 },
    ]);
  });

  it("clears the week without inserting anything when every day is closed", async () => {
    const result = await saveBusinessHoursAction(LISTING, []);
    expect(result.ok).toBe(true);
    expect(state.calls).toContain("vibe_business_hours.delete");
    expect(state.calls).not.toContain("vibe_business_hours.insert");
  });

  it("rejects an overnight range before deleting anything", async () => {
    const result = await saveBusinessHoursAction(LISTING, [{ weekday: 5, opensMinutes: 1080, closesMinutes: 120 }]);
    expect(result.ok).toBe(false);
    expect(state.calls).not.toContain("vibe_business_hours.delete");
  });

  it("does not touch a listing the caller cannot see", async () => {
    state.results["vibe_listings.select"] = { data: null };
    const result = await saveBusinessHoursAction(LISTING, week);
    expect(result).toEqual({ ok: false, error: "We couldn't find that." });
    expect(state.calls).not.toContain("vibe_business_hours.delete");
  });
});
