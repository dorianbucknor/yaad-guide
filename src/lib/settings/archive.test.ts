import { describe, expect, it } from "vitest";

import { formatUntil, isDeleteConfirmed, purgeDate } from "./archive";

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

describe("formatUntil", () => {
  it("formats a valid yyyy-MM-dd date", () => {
    expect(formatUntil("2026-11-13")).toBe("13 November 2026");
  });
  it.each([undefined, "", "tomorrow", "2026-13-40", "2026-02-30", "13/11/2026"])(
    "returns null for %s",
    (value) => {
      expect(formatUntil(value)).toBeNull();
    },
  );
});
