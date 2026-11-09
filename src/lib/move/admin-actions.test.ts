import { beforeEach, describe, expect, it, vi } from "vitest";

type Result = { data?: unknown; error?: { message: string; code?: string } | null };

const state = vi.hoisted(() => ({
  user: { id: "admin-1", app_metadata: {} } as { id: string; app_metadata: Record<string, unknown> } | null,
  allowed: true,
  results: {} as Record<string, Result>,
  calls: [] as { name: string; args: unknown }[],
  payloads: {} as Record<string, unknown>,
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    rpc: async (name: string, args: unknown) => {
      if (name === "authorize") return { data: state.allowed, error: null };
      state.calls.push({ name, args });
      return state.results[`rpc.${name}`] ?? { data: null, error: null };
    },
    from: (table: string) => {
      let op = "select";
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        insert: (payload: unknown) => ((op = "insert"), (state.payloads[`${table}.insert`] = payload), builder),
        update: (payload: unknown) => ((op = "update"), (state.payloads[`${table}.update`] = payload), builder),
        then: (resolve: (value: Result) => unknown) =>
          Promise.resolve(state.results[`${table}.${op}`] ?? { data: [{ id: "x" }], error: null }).then(resolve),
      };
      return builder;
    },
  }),
}));

import {
  resolveFlagAction,
  resolveSuggestionAction,
  reviewListingAction,
  savePlaceAction,
  verifyProfilePhotoAction,
} from "./admin-actions";

const id = "00000000-0000-4000-8000-000000000001";
const place = { name: "Treasure Beach", kind: "town", parish: "St. Elizabeth", lat: 17.88, lng: -77.76, active: true };

beforeEach(() => {
  state.user = { id: "admin-1", app_metadata: {} };
  state.allowed = true;
  state.results = {};
  state.calls = [];
  state.payloads = {};
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("reviewListingAction", () => {
  it("validates the decision and requires a note to reject", async () => {
    expect((await reviewListingAction({ listingId: id, decision: "maybe" })).ok).toBe(false);
    const reject = await reviewListingAction({ listingId: id, decision: "reject", note: "  " });
    expect(reject.ok).toBe(false);
    expect(state.calls).toHaveLength(0);
  });

  it("calls the database function", async () => {
    expect((await reviewListingAction({ listingId: id, decision: "approve" })).ok).toBe(true);
    expect(state.calls[0]).toEqual({
      name: "review_listing",
      args: { p_listing_id: id, p_decision: "approve", p_note: null },
    });
  });

  it("turns a permission error into a plain refusal", async () => {
    state.results["rpc.review_listing"] = { error: { message: "permission denied", code: "42501" } };
    expect(await reviewListingAction({ listingId: id, decision: "approve" })).toEqual({
      ok: false,
      error: "You can't do that.",
    });
  });

  it("refuses an archived admin", async () => {
    state.user = { id: "admin-1", app_metadata: { archived: true } };
    expect((await reviewListingAction({ listingId: id, decision: "approve" })).ok).toBe(false);
    expect(state.calls).toHaveLength(0);
  });
});

describe("flags and profile photo", () => {
  it("resolves a flag and verifies a photo through the database", async () => {
    await resolveFlagAction(id);
    await verifyProfilePhotoAction(id);
    expect(state.calls.map((c) => c.name)).toEqual(["resolve_listing_flag", "verify_profile_photo"]);
  });

  it("rejects ids that are not uuids", async () => {
    expect((await resolveFlagAction("nope")).ok).toBe(false);
    expect((await verifyProfilePhotoAction("nope")).ok).toBe(false);
    expect(state.calls).toHaveLength(0);
  });
});

describe("places", () => {
  it("refuses without the permission and does not write", async () => {
    state.allowed = false;
    expect(await savePlaceAction(place)).toEqual({ ok: false, error: "You can't do that." });
    expect(await resolveSuggestionAction({ id, status: "added" })).toEqual({ ok: false, error: "You can't do that." });
    expect(state.payloads).toEqual({});
  });

  it("validates coordinates stay inside Jamaica", async () => {
    expect((await savePlaceAction({ ...place, lat: 40 })).ok).toBe(false);
    expect((await savePlaceAction({ ...place, name: "" })).ok).toBe(false);
  });

  it("adds a place with a slug made from the name, and edits by id", async () => {
    await savePlaceAction(place);
    expect(state.payloads["places.insert"]).toMatchObject({ slug: "treasure-beach", name: "Treasure Beach" });
    await savePlaceAction({ ...place, id });
    expect(state.payloads["places.update"]).toMatchObject({ name: "Treasure Beach" });
  });

  it("resolves a suggestion only to added or dismissed", async () => {
    expect((await resolveSuggestionAction({ id, status: "open" })).ok).toBe(false);
    expect((await resolveSuggestionAction({ id, status: "dismissed" })).ok).toBe(true);
    expect(state.payloads["place_suggestions.update"]).toEqual({ status: "dismissed" });
  });
});
