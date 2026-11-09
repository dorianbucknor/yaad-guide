import { beforeEach, describe, expect, it, vi } from "vitest";

type Result = { data?: unknown; error?: { message: string; code?: string } | null };

const state = vi.hoisted(() => ({
  user: { id: "a1", app_metadata: {} } as { id: string; app_metadata: Record<string, unknown> } | null,
  results: {} as Record<string, Result>,
  rpcCalls: [] as { name: string; args: unknown }[],
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    rpc: async (name: string, args: unknown) => {
      state.rpcCalls.push({ name, args });
      return state.results[`rpc.${name}`] ?? { data: null, error: null };
    },
  }),
}));

import { resolveVibeFlagAction, reviewVibeListingAction } from "./admin-actions";
import { NOT_ALLOWED } from "@/lib/auth/action-helpers";

const LISTING = "11111111-1111-4111-8111-111111111111";
const FLAG = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  state.user = { id: "a1", app_metadata: {} };
  state.results = {};
  state.rpcCalls = [];
});

describe("reviewVibeListingAction", () => {
  it("asks a signed-out caller to sign in", async () => {
    state.user = null;
    const result = await reviewVibeListingAction({ listingId: LISTING, decision: "approve" });
    expect(result).toEqual({ ok: false, error: "Please sign in again to continue." });
    expect(state.rpcCalls).toEqual([]);
  });

  it("needs a note to send a listing back, and does not call the database without one", async () => {
    const result = await reviewVibeListingAction({ listingId: LISTING, decision: "reject" });
    expect(result.ok).toBe(false);
    expect(state.rpcCalls).toEqual([]);
  });

  it("approves through the database function", async () => {
    const result = await reviewVibeListingAction({ listingId: LISTING, decision: "approve" });
    expect(result.ok).toBe(true);
    expect(state.rpcCalls[0]).toEqual({
      name: "review_vibe_listing",
      args: { p_listing_id: LISTING, p_decision: "approve", p_note: null },
    });
  });

  it("sends a listing back with the admin's note", async () => {
    await reviewVibeListingAction({ listingId: LISTING, decision: "reject", note: "Add a clearer cover photo" });
    expect(state.rpcCalls[0].args).toMatchObject({ p_decision: "reject", p_note: "Add a clearer cover photo" });
  });

  it("tells a non-admin they cannot do that", async () => {
    state.results["rpc.review_vibe_listing"] = { error: { message: "permission denied", code: "42501" } };
    const result = await reviewVibeListingAction({ listingId: LISTING, decision: "approve" });
    expect(result).toEqual({ ok: false, error: NOT_ALLOWED });
  });
});

describe("resolveVibeFlagAction", () => {
  it("rejects an id that is not a uuid", async () => {
    const result = await resolveVibeFlagAction("nope");
    expect(result.ok).toBe(false);
    expect(state.rpcCalls).toEqual([]);
  });

  it("resolves a flag through the database function", async () => {
    const result = await resolveVibeFlagAction(FLAG);
    expect(result.ok).toBe(true);
    expect(state.rpcCalls[0]).toEqual({ name: "resolve_vibe_listing_flag", args: { p_id: FLAG } });
  });
});
