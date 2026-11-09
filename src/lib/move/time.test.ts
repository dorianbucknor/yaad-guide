import { describe, expect, it } from "vitest";

import { jamaicaDayStart, localDayOf } from "./time";

describe("jamaica day helpers", () => {
  it("starts a Jamaica day at 05:00 UTC", () => {
    expect(jamaicaDayStart("2026-11-09").toISOString()).toBe("2026-11-09T05:00:00.000Z");
  });

  it("names the local day of an instant, not the UTC day", () => {
    expect(localDayOf(new Date("2026-11-10T03:00:00Z"))).toBe("2026-11-09");
    expect(localDayOf(new Date("2026-11-10T05:00:00Z"))).toBe("2026-11-10");
  });
});
