import { describe, expect, it } from "vitest";

import { formatTimeUntil } from "./format";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatTimeUntil", () => {
  it("counts minutes under an hour", () => {
    expect(formatTimeUntil(48 * MIN)).toBe("in 48 mins");
    expect(formatTimeUntil(MIN)).toBe("in 1 min");
  });
  it("counts hours under a day", () => {
    expect(formatTimeUntil(5 * HOUR + 20 * MIN)).toBe("in 5 hrs");
    expect(formatTimeUntil(HOUR)).toBe("in 1 hr");
  });
  it("counts days under a week", () => {
    expect(formatTimeUntil(4 * DAY + 3 * HOUR)).toBe("in 4 days");
    expect(formatTimeUntil(DAY)).toBe("in 1 day");
  });
  it("says nothing for the past or a week and more away", () => {
    expect(formatTimeUntil(0)).toBeNull();
    expect(formatTimeUntil(-MIN)).toBeNull();
    expect(formatTimeUntil(7 * DAY)).toBeNull();
  });
});
