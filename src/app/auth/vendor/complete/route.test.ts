import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => [] as string[]);

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { phone: "+18765551234" } } }),
      refreshSession: async () => {
        calls.push("refresh");
        return { error: null };
      },
    },
    rpc: async () => {
      calls.push("rpc");
      return { error: null };
    },
  }),
}));

import { GET } from "./route";

describe("GET /auth/vendor/complete", () => {
  it("refreshes the session after claiming so the new role reaches the token", async () => {
    const response = await GET(
      new NextRequest("http://localhost/auth/vendor/complete"),
    );
    expect(calls).toEqual(["rpc", "refresh"]);
    expect(response.headers.get("location")).toBe("http://localhost/v");
  });
});
