import { describe, expect, it } from "vitest";

import { getSupabaseEnv } from "./env";

const complete = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc",
};

describe("getSupabaseEnv", () => {
  it("returns the url and publishable key from a complete source", () => {
    expect(getSupabaseEnv(complete)).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_abc",
    });
  });

  it("throws naming the url variable when it is missing", () => {
    expect(() =>
      getSupabaseEnv({ ...complete, NEXT_PUBLIC_SUPABASE_URL: undefined }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("throws naming the key variable when it is missing", () => {
    expect(() =>
      getSupabaseEnv({
        ...complete,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
      }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });

  it("throws naming the key variable when it is empty", () => {
    expect(() =>
      getSupabaseEnv({ ...complete, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });
});
