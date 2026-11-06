import { describe, expect, it } from "vitest";

import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it.each(["/plan", "/plan?x=1", "/vendor/listings", "/"])(
    "keeps the same-site path %s",
    (value) => {
      expect(safeNextPath(value)).toBe(value);
    },
  );

  it.each([
    "//evil.com",
    "/\\evil.com",
    "https://x.com",
    "javascript:alert(1)",
    "%2F%2Fevil.com",
    "/%2Fevil.com",
    "",
    null,
    undefined,
    "/plan\nSet-Cookie: a=b",
    "plan",
  ])("falls back to / for %j", (value) => {
    expect(safeNextPath(value)).toBe("/");
  });

  it("uses the given fallback", () => {
    expect(safeNextPath("//evil.com", "/profile")).toBe("/profile");
  });
});
