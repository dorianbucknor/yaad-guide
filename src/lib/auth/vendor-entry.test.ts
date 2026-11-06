import { describe, expect, it } from "vitest";

import { vendorEntryHref } from "./vendor-entry";

describe("vendorEntryHref", () => {
  it("sends guests to the vendor sign-up form", () => {
    expect(vendorEntryHref(false)).toBe("/auth/vendor");
  });

  it("sends signed-in users straight to the role upgrade, not the sign-up form", () => {
    expect(vendorEntryHref(true)).toBe("/auth/vendor/complete");
  });
});
