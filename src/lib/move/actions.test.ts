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
    storage: { from: () => ({ remove: async () => ({ error: null }) }) },
    rpc: async (name: string) => state.results[`rpc.${name}`] ?? { data: null, error: null },
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
        in: () => builder,
        lt: () => builder,
        gt: () => builder,
        lte: () => builder,
        gte: () => builder,
        order: () => builder,
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

import {
  saveFlatRateAction,
  saveListingAction,
  setPausedAction,
  submitListingAction,
  suggestPlaceAction,
} from "./actions";

const listing = { currency: "usd", islandWide: false, baseFare: 10, perKm: 1.5, hourlyRate: null, description: "Hi" };
const placeLow = "00000000-0000-4000-8000-000000000001";
const placeHigh = "ffffffff-0000-4000-8000-000000000002";

beforeEach(() => {
  state.user = { id: "u1", app_metadata: {} };
  state.results = {
    "vendor_profiles.select": { data: { id: "p1" } },
    "move_listings.select": { data: { id: "l1" } },
  };
  state.calls = [];
  state.payloads = {};
});

describe("move listing actions", () => {
  it("asks an unauthenticated user to sign in", async () => {
    state.user = null;
    expect(await saveListingAction(listing)).toEqual({ ok: false, error: "Please sign in again to continue." });
  });

  it("refuses an archived account", async () => {
    state.user = { id: "u1", app_metadata: { archived: true } };
    const result = await saveListingAction(listing);
    expect(result.ok).toBe(false);
    expect(state.calls).toEqual([]);
  });

  it("returns field errors for invalid input", async () => {
    const result = await saveListingAction({ ...listing, currency: "eur" });
    expect(result).toMatchObject({ ok: false, fieldErrors: { currency: expect.any(String) } });
  });

  it("creates the listing when none exists", async () => {
    state.results["move_listings.select"] = { data: null };
    expect(await saveListingAction(listing)).toEqual({ ok: true });
    expect(state.calls).toContain("move_listings.insert");
  });

  it("updates the listing when one exists", async () => {
    expect(await saveListingAction(listing)).toEqual({ ok: true });
    expect(state.calls).toContain("move_listings.update");
  });

  it("asks for business details first", async () => {
    state.results["vendor_profiles.select"] = { data: null };
    expect(await saveListingAction(listing)).toEqual({ ok: false, error: "Save your business details first." });
  });

  it("stores a flat rate with the places in id order", async () => {
    const result = await saveFlatRateAction({ placeAId: placeHigh, placeBId: placeLow, price: 80 });
    expect(result).toEqual({ ok: true });
    expect(state.payloads["move_flat_rates.upsert"]).toMatchObject({
      place_a_id: placeLow,
      place_b_id: placeHigh,
      price: 80,
    });
  });

  it("shows the database's message when a flat rate is refused", async () => {
    state.results["move_flat_rates.upsert"] = {
      error: { message: "Add both places to your coverage before setting a rate between them.", code: "P0001" },
    };
    const result = await saveFlatRateAction({ placeAId: placeLow, placeBId: placeHigh, price: 80 });
    expect(result).toEqual({
      ok: false,
      error: "Add both places to your coverage before setting a rate between them.",
    });
  });

  it("pauses the listing", async () => {
    expect(await setPausedAction(true)).toEqual({ ok: true });
    expect(state.payloads["move_listings.update"]).toEqual({ paused: true });
  });

  it("shows why a listing cannot be submitted", async () => {
    state.results["rpc.submit_listing_for_review"] = {
      error: { message: "Your listing isn't ready yet. Finish the missing steps first.", code: "P0001" },
    };
    expect(await submitListingAction()).toEqual({
      ok: false,
      error: "Your listing isn't ready yet. Finish the missing steps first.",
    });
  });

  it("records a place suggestion for the vendor's own profile", async () => {
    expect(await suggestPlaceAction({ name: "Robins Bay", note: "Near Port Maria" })).toEqual({ ok: true });
    expect(state.payloads["place_suggestions.insert"]).toMatchObject({
      vendor_profile_id: "p1",
      name: "Robins Bay",
    });
  });
});
