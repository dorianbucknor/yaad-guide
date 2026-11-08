import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "u1", app_metadata: {} } as { id: string; app_metadata: Record<string, unknown> } | null,
  rpc: { error: null } as { error: { message: string; code?: string } | null },
  calls: [] as { name: string; args: unknown }[],
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    rpc: async (name: string, args: unknown) => {
      state.calls.push({ name, args });
      return state.rpc;
    },
  }),
}));

import { acceptRequestAction, declineRequestAction } from "./request-actions";

const id = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  state.user = { id: "u1", app_metadata: {} };
  state.rpc = { error: null };
  state.calls = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("declineRequestAction", () => {
  it("accepts only the four reasons", async () => {
    const bad = await declineRequestAction({ id, reason: "bored" as never });
    expect(bad.ok).toBe(false);
    expect(state.calls).toHaveLength(0);
    for (const reason of ["dates_blocked", "too_far", "vehicle_unavailable", "other"] as const) {
      expect((await declineRequestAction({ id, reason })).ok).toBe(true);
    }
    expect(state.calls[0]).toEqual({ name: "decline_move_request", args: { p_id: id, p_reason: "dates_blocked" } });
  });

  it("refuses archived users", async () => {
    state.user = { id: "u1", app_metadata: { archived: true } };
    const result = await declineRequestAction({ id, reason: "other" });
    expect(result.ok).toBe(false);
    expect(state.calls).toHaveLength(0);
  });

  it("surfaces the database message", async () => {
    state.rpc = { error: { message: "This request has expired.", code: "P0001" } };
    expect(await declineRequestAction({ id, reason: "other" })).toEqual({
      ok: false,
      error: "This request has expired.",
    });
  });
});

describe("acceptRequestAction", () => {
  it("rejects a note over 300 characters", async () => {
    const result = await acceptRequestAction({ id, note: "x".repeat(301) });
    expect(result.ok).toBe(false);
    expect(state.calls).toHaveLength(0);
  });

  it("passes the note, or null when absent", async () => {
    await acceptRequestAction({ id, note: "See you at arrivals" });
    await acceptRequestAction({ id });
    expect(state.calls.map((c) => c.args)).toEqual([
      { p_id: id, p_note: "See you at arrivals" },
      { p_id: id, p_note: null },
    ]);
  });

  it("requires a signed-in user", async () => {
    state.user = null;
    expect((await acceptRequestAction({ id })).ok).toBe(false);
  });

  it("surfaces a conflict message and hides unknown errors", async () => {
    state.rpc = { error: { message: "That overlaps another trip.", code: "P0001" } };
    expect(await acceptRequestAction({ id })).toEqual({ ok: false, error: "That overlaps another trip." });
    state.rpc = { error: { message: "relation boom", code: "XX000" } };
    const result = await acceptRequestAction({ id });
    expect(result.ok === false && result.error).not.toContain("boom");
  });
});
