import { describe, expect, it } from "vitest";

import { assertLocalSupabase } from "./seed-guard";

describe("assertLocalSupabase", () => {
  it("accepts the local stack", () => {
    expect(() => assertLocalSupabase("http://127.0.0.1:54321", "development")).not.toThrow();
    expect(() => assertLocalSupabase("http://localhost:54321", undefined)).not.toThrow();
  });

  it("rejects hosted projects, empty and malformed values", () => {
    expect(() => assertLocalSupabase("https://abcd.supabase.co", "development")).toThrow();
    expect(() => assertLocalSupabase("http://127.0.0.1.evil.com", "development")).toThrow();
    expect(() => assertLocalSupabase("", "development")).toThrow();
    expect(() => assertLocalSupabase(undefined, "development")).toThrow();
    expect(() => assertLocalSupabase("not a url", "development")).toThrow();
  });

  it("rejects a local URL in production", () => {
    expect(() => assertLocalSupabase("http://127.0.0.1:54321", "production")).toThrow();
  });
});
