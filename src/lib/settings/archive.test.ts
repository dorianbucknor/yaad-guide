import { describe, expect, it } from "vitest";

import { isDeleteConfirmed, purgeDate } from "./archive";

describe("purgeDate", () => {
  it("adds seven days in UTC", () => {
    expect(purgeDate("2026-11-06T23:30:00Z")).toBe("2026-11-13");
  });
});

describe("isDeleteConfirmed", () => {
  it("accepts DELETE, trimmed", () => {
    expect(isDeleteConfirmed("DELETE")).toBe(true);
    expect(isDeleteConfirmed(" DELETE ")).toBe(true);
  });
  it("rejects anything else", () => {
    expect(isDeleteConfirmed("delete")).toBe(false);
    expect(isDeleteConfirmed("DELET")).toBe(false);
  });
});
