import { beforeEach, describe, expect, it, vi } from "vitest";

type Result = { data?: unknown; error?: { message: string; code?: string } | null };

const state = vi.hoisted(() => ({
  user: { id: "u1", app_metadata: {} } as { id: string; app_metadata: Record<string, unknown> } | null,
  results: {} as Record<string, Result>,
  calls: [] as string[],
  payloads: {} as Record<string, unknown>,
  rpcCalls: [] as { name: string; args: unknown }[],
  removed: [] as string[][],
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    storage: {
      from: () => ({
        remove: async (paths: string[]) => {
          state.removed.push(paths);
          return { error: null };
        },
      }),
    },
    rpc: async (name: string, args: unknown) => {
      state.rpcCalls.push({ name, args });
      return state.results[`rpc.${name}`] ?? { data: null, error: null };
    },
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
        gt: () => builder,
        gte: () => builder,
        lt: () => builder,
        lte: () => builder,
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

import {
  addSlotAction,
  clearAutoSlotsAction,
  createListingAction,
  editSlotAction,
  recordPhotoAction,
  saveScheduleAction,
  saveTicketTypeAction,
  setDateClosedAction,
  submitListingAction,
} from "./actions";

function entity(id: string, name: string) {
  return { id, business_name: name, primary_region: "St. Ann", status: "draft", review_note: null, submitted_at: null };
}

const LISTING = "11111111-1111-4111-8111-111111111111";
const SLOT = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  state.user = { id: "u1", app_metadata: {} };
  state.results = {
    "vendor_profiles.select": { data: [entity("p1", "One")] },
    "vibe_listings.select": { data: { id: LISTING } },
  };
  state.calls = [];
  state.payloads = {};
  state.rpcCalls = [];
  state.removed = [];
});

const basics = {
  subtype: "attraction",
  title: "Blue Hole tour",
  currency: "usd",
  durationMinutes: 120,
};

describe("signed-out and unknown listings", () => {
  it("asks a signed-out caller to sign in", async () => {
    state.user = null;
    const result = await createListingAction(basics);
    expect(result).toEqual({ ok: false, error: "Please sign in again to continue." });
    expect(state.calls).toEqual([]);
  });

  it("does not touch a listing the caller cannot see", async () => {
    state.results["vibe_listings.select"] = { data: null };
    const result = await submitListingAction(LISTING);
    expect(result).toEqual({ ok: false, error: "We couldn't find that." });
    expect(state.rpcCalls).toEqual([]);
  });
});

describe("createListingAction", () => {
  it("needs a vibe vendor profile first", async () => {
    state.results["vendor_profiles.select"] = { data: [] };
    const result = await createListingAction(basics);
    expect(result).toEqual({ ok: false, error: "Save your business details first." });
  });

  it("will not guess the business when there are two and none is chosen", async () => {
    state.results["vendor_profiles.select"] = { data: [entity("p1", "One"), entity("p2", "Two")] };
    const result = await createListingAction(basics);
    expect(result).toEqual({ ok: false, error: "Choose which business this listing is for." });
    expect(state.calls).not.toContain("vibe_listings.insert");
  });

  it("creates the listing under the chosen business", async () => {
    const [A, B] = ["a1111111-1111-4111-8111-111111111111", "a2222222-2222-4222-8222-222222222222"];
    state.results["vendor_profiles.select"] = { data: [entity(A, "One"), entity(B, "Two")] };
    const result = await createListingAction({ ...basics, entityId: B });
    expect(result.ok).toBe(true);
    expect(state.payloads["vibe_listings.insert"]).toMatchObject({ vendor_profile_id: B });
  });

  it("refuses a business the account does not own", async () => {
    const result = await createListingAction({ ...basics, entityId: "a2222222-2222-4222-8222-222222222222" });
    expect(result).toEqual({ ok: false, error: "Choose which business this listing is for." });
    expect(state.calls).not.toContain("vibe_listings.insert");
  });

  it("creates the listing under the profile with an id it chose itself, so no row is read back", async () => {
    const result = await createListingAction(basics);
    expect(result.ok).toBe(true);
    const id = result.ok ? result.data?.id : undefined;
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(state.payloads["vibe_listings.insert"]).toMatchObject({
      id,
      vendor_profile_id: "p1",
      subtype: "attraction",
      title: "Blue Hole tour",
      currency: "usd",
      duration_minutes: 120,
      booking_cutoff_minutes: 60,
    });
  });

  it("rejects bad basics without writing", async () => {
    const result = await createListingAction({ ...basics, title: "Hi" });
    expect(result.ok).toBe(false);
    expect(state.calls).not.toContain("vibe_listings.insert");
  });
});

describe("saveTicketTypeAction", () => {
  it("refuses a free ticket without confirmation before calling the database", async () => {
    const result = await saveTicketTypeAction(LISTING, { name: "Child", price: 0 });
    expect(result.ok).toBe(false);
    expect(state.rpcCalls).toEqual([]);
  });

  it("passes the confirmation through for a free ticket", async () => {
    const result = await saveTicketTypeAction(LISTING, { name: "Child", price: 0, confirmFree: true });
    expect(result.ok).toBe(true);
    expect(state.rpcCalls[0]).toEqual({
      name: "save_vibe_ticket_type",
      args: {
        p_listing_id: LISTING,
        p_id: null,
        p_name: "Child",
        p_description: null,
        p_price: 0,
        p_discount_percent: null,
        p_max_per_booking: null,
        p_sort_order: 0,
        p_confirm_free: true,
      },
    });
  });

  it("saves a paid ticket with a discount", async () => {
    await saveTicketTypeAction(LISTING, { name: "Adult", price: 20, discountPercent: 25, description: "Ages 13+" });
    expect(state.rpcCalls[0].args).toMatchObject({
      p_price: 20,
      p_discount_percent: 25,
      p_description: "Ages 13+",
      p_confirm_free: false,
    });
  });
});

describe("saveScheduleAction", () => {
  it("sets the switch, then replaces the weekly rules", async () => {
    const result = await saveScheduleAction(LISTING, {
      autoGenerate: false,
      rules: [{ weekday: 2, startMinutes: 600, capacity: 40 }],
    });
    expect(result.ok).toBe(true);
    expect(state.payloads["vibe_listings.update"]).toEqual({ auto_generate_slots: false });
    expect(state.calls).toContain("vibe_schedule_rules.delete");
    expect(state.payloads["vibe_schedule_rules.insert"]).toEqual([
      { listing_id: LISTING, weekday: 2, start_minutes: 600, capacity: 40, valid_from: null, valid_until: null },
    ]);
  });

  it("rejects a schedule without the switch", async () => {
    const result = await saveScheduleAction(LISTING, { rules: [] });
    expect(result.ok).toBe(false);
    expect(state.calls).not.toContain("vibe_schedule_rules.delete");
  });
});

describe("slots", () => {
  const future = () => new Date(Date.now() + 86_400_000).toISOString();

  it("adds a slot by hand", async () => {
    const result = await addSlotAction(LISTING, { startsAt: future(), capacity: 12 });
    expect(result.ok).toBe(true);
    expect(state.payloads["vibe_slots.insert"]).toMatchObject({ listing_id: LISTING, capacity: 12 });
  });

  it("explains a duplicate time", async () => {
    state.results["vibe_slots.insert"] = { error: { message: "dup", code: "23505" } };
    const result = await addSlotAction(LISTING, { startsAt: future(), capacity: 12 });
    expect(result).toEqual({ ok: false, error: "There is already a slot at that time." });
  });

  it("shows the database's message when capacity drops below the bookings", async () => {
    state.results["vibe_slots.update"] = {
      error: { message: "This slot already has 2 booked; capacity can't go below that.", code: "P0001" },
    };
    const result = await editSlotAction({ id: SLOT, capacity: 1, status: "open" });
    expect(result).toEqual({ ok: false, error: "This slot already has 2 booked; capacity can't go below that." });
  });

  it("shows the database's message when a day with bookings is closed", async () => {
    state.results["rpc.set_vibe_date_closed"] = {
      error: { message: "This day has bookings, so it can't be closed.", code: "P0001" },
    };
    const result = await setDateClosedAction(LISTING, { day: "2026-11-20", closed: true });
    expect(result).toEqual({ ok: false, error: "This day has bookings, so it can't be closed." });
    expect(state.rpcCalls[0].args).toEqual({ p_listing_id: LISTING, p_day: "2026-11-20", p_closed: true });
  });

  it("reports how many auto slots were cleared", async () => {
    state.results["rpc.clear_vibe_auto_slots"] = { data: 11 };
    const result = await clearAutoSlotsAction(LISTING);
    expect(result).toEqual({ ok: true, data: { cleared: 11 } });
  });
});

describe("photos and submitting", () => {
  it("rejects a photo path outside the listing folder", async () => {
    const result = await recordPhotoAction({ listingId: LISTING, path: `u1/vibe/${SLOT}/a.jpg` });
    expect(result).toEqual({ ok: false, error: "That file path is not allowed." });
    expect(state.calls).not.toContain("vibe_photos.insert");
  });

  it("makes the first photo the cover", async () => {
    state.results["vibe_photos.select"] = { data: [] };
    const result = await recordPhotoAction({ listingId: LISTING, path: `u1/vibe/${LISTING}/a.jpg` });
    expect(result.ok).toBe(true);
    expect(state.payloads["vibe_photos.insert"]).toMatchObject({ listing_id: LISTING, is_cover: true, position: 0 });
  });

  it("submits through the database function", async () => {
    const result = await submitListingAction(LISTING);
    expect(result.ok).toBe(true);
    expect(state.rpcCalls[0]).toEqual({ name: "submit_vibe_listing", args: { p_listing_id: LISTING } });
  });
});
