import { describe, expect, it } from "vitest";

import { LISTING_TABS, resolveTab } from "./listing-tab-names";

describe("resolveTab", () => {
  it("keeps every current tab name", () => {
    for (const tab of LISTING_TABS) expect(resolveTab(tab)).toBe(tab);
  });
  it("sends the old Coverage, Hours and Photos links to the merged tabs", () => {
    expect(resolveTab("coverage")).toBe("service");
    expect(resolveTab("availability")).toBe("service");
    expect(resolveTab("photos")).toBe("vehicles");
  });
  it("opens Overview for nothing or something unknown", () => {
    expect(resolveTab(undefined)).toBe("overview");
    expect(resolveTab("nope")).toBe("overview");
  });
});
