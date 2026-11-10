import { describe, expect, it } from "vitest";

import { entityHref, setupStatus } from "./entity-view";

describe("entityHref", () => {
  it("keeps the plain address when the vendor has one business, so the old links still work", () => {
    expect(entityHref("/v/vibe/profile", 1, "abc")).toBe("/v/vibe/profile");
    expect(entityHref("/v/vibe/profile", 0, "abc")).toBe("/v/vibe/profile");
  });

  it("names the business once there are several", () => {
    expect(entityHref("/v/vibe/profile", 2, "abc")).toBe("/v/vibe/profile?entity=abc");
  });
});

describe("setupStatus", () => {
  const e = (status: "draft" | "pending" | "approved" | "rejected") => ({ status });

  it("is undefined when there is no business yet", () => {
    expect(setupStatus([])).toBeUndefined();
  });

  it("shows a business that is with an admin ahead of a draft", () => {
    expect(setupStatus([e("draft"), e("pending")])).toBe("pending");
  });

  it("shows a rejection ahead of a draft, so the vendor sees what to fix", () => {
    expect(setupStatus([e("draft"), e("rejected")])).toBe("rejected");
  });

  it("falls back to the first business", () => {
    expect(setupStatus([e("draft"), e("draft")])).toBe("draft");
  });
});
