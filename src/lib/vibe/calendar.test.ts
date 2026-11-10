import { describe, expect, it } from "vitest";

import { addDays, groupRuns, groupSlotsByDay, monthGrid, monthRange, shiftMonth } from "./calendar";
import type { VibeSlot } from "./types";

const slot = (startsAt: string): VibeSlot => ({
  id: startsAt,
  listingId: "l1",
  startsAt,
  capacity: 10,
  booked: 0,
  status: "open",
  source: "rule",
});

describe("addDays", () => {
  it("crosses month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("groupRuns", () => {
  it("joins consecutive days and splits at gaps", () => {
    expect(groupRuns(["2026-11-12", "2026-11-10", "2026-11-11", "2026-11-20"])).toEqual([
      { from: "2026-11-10", to: "2026-11-12" },
      { from: "2026-11-20", to: "2026-11-20" },
    ]);
  });
  it("joins across a month end and ignores repeats", () => {
    expect(groupRuns(["2026-11-30", "2026-12-01", "2026-12-01"])).toEqual([{ from: "2026-11-30", to: "2026-12-01" }]);
  });
  it("is empty for no days", () => {
    expect(groupRuns([])).toEqual([]);
  });
});

describe("monthRange", () => {
  it("gives the first day, the first day of the next month, and the day count", () => {
    expect(monthRange("2026-11")).toEqual({ from: "2026-11-01", to: "2026-12-01", days: 30 });
    expect(monthRange("2026-12")).toEqual({ from: "2026-12-01", to: "2027-01-01", days: 31 });
    expect(monthRange("2028-02").days).toBe(29);
  });
});

describe("shiftMonth", () => {
  it("moves across year ends", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", 0)).toBe("2026-11");
  });
});

describe("monthGrid", () => {
  it("starts weeks on Monday and pads with nulls", () => {
    const weeks = monthGrid("2026-11"); // 1 November 2026 is a Sunday
    expect(weeks[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(weeks[1][0]).toBe("2026-11-02");
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });

  it("has no leading padding when the month starts on a Monday", () => {
    expect(monthGrid("2026-06")[0][0]).toBe("2026-06-01");
  });
});

describe("groupSlotsByDay", () => {
  it("groups by Jamaica calendar day, so 23:30 stays on its own day", () => {
    // 23:30 on 20 November in Jamaica is 04:30 on 21 November in UTC.
    const grouped = groupSlotsByDay([slot("2026-11-21T04:30:00.000Z"), slot("2026-11-20T15:00:00.000Z")]);
    expect([...grouped.keys()].sort()).toEqual(["2026-11-20"]);
    expect(grouped.get("2026-11-20")).toHaveLength(2);
  });

  it("orders each day's slots by start time", () => {
    const grouped = groupSlotsByDay([slot("2026-11-20T20:00:00.000Z"), slot("2026-11-20T14:00:00.000Z")]);
    expect(grouped.get("2026-11-20")?.map((s) => s.startsAt)).toEqual(["2026-11-20T14:00:00.000Z", "2026-11-20T20:00:00.000Z"]);
  });
});
