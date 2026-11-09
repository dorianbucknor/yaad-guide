import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  eqs: [] as [string, unknown][],
  profile: { id: "p1" } as { id: string } | null,
}));

vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: (table: string) => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          state.eqs.push([`${table}.${column}`, value]);
          return builder;
        },
        or: () => builder,
        order: () => builder,
        maybeSingle: async () => ({ data: state.profile, error: null }),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
      };
      return builder;
    },
  }),
}));

import { getDashboard } from "./dashboard-queries";

beforeEach(() => {
  state.eqs = [];
  state.profile = { id: "p1" };
});

describe("getDashboard", () => {
  it("reads only the signed-in vendor's own requests, not ones row security also admits", async () => {
    await getDashboard();
    expect(state.eqs).toContainEqual(["move_requests.vendor_profile_id", "p1"]);
  });

  it("returns an empty dashboard for a user with no MOVE profile", async () => {
    state.profile = null;
    const data = await getDashboard();
    expect(data.requests).toEqual([]);
    expect(state.eqs.some(([k]) => k === "move_requests.vendor_profile_id")).toBe(false);
  });
});
