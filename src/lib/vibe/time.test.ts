import { describe, expect, it } from "vitest";

import { WEEKDAYS, WEEKDAY_ORDER, jamaicaToIso, minutesLabel } from "./time";

describe("jamaicaToIso", () => {
  it("turns a Jamaica day and time into the UTC instant", () => {
    expect(jamaicaToIso("2026-11-20", 600)).toBe("2026-11-20T15:00:00.000Z");
  });

  it("rolls into the next UTC day for late evening times", () => {
    expect(jamaicaToIso("2026-11-20", 23 * 60 + 30)).toBe("2026-11-21T04:30:00.000Z");
  });
});

describe("minutesLabel", () => {
  it("shows a 24-hour clock with leading zeros", () => {
    expect(minutesLabel(0)).toBe("00:00");
    expect(minutesLabel(570)).toBe("09:30");
    expect(minutesLabel(1410)).toBe("23:30");
  });
});

describe("weekdays", () => {
  it("names Sunday as 0 and lists Monday first for display", () => {
    expect(WEEKDAYS[0]).toBe("Sunday");
    expect(WEEKDAY_ORDER).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });
});
