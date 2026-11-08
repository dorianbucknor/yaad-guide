import { describe, expect, it } from "vitest";

import { isAvailable } from "./availability";
import { toJamaica } from "./time";

// Jamaica is UTC-5 all year, so 14:00Z is 09:00 local.
const at = (iso: string): Date => new Date(iso);
const weekdayRules = [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({
  weekday,
  startMinutes: 8 * 60,
  endMinutes: 18 * 60,
}));
const base = { paused: false, rules: weekdayRules, blocks: [], accepted: [], bufferMinutes: 30 };

describe("toJamaica", () => {
  it("shows UTC midnight as 19:00 the previous day", () => {
    expect(toJamaica(at("2026-11-10T00:00:00Z"))).toEqual({ weekday: 1, minutes: 19 * 60, day: "2026-11-09" });
  });
});

describe("isAvailable", () => {
  it("accepts a trip inside the weekly window", () => {
    // 09:00 to 11:00 local
    expect(isAvailable({ ...base, start: at("2026-11-10T14:00:00Z"), end: at("2026-11-10T16:00:00Z") })).toEqual({ ok: true });
  });

  it("rejects a trip that runs past the window", () => {
    // 17:00 to 19:00 local
    expect(isAvailable({ ...base, start: at("2026-11-10T22:00:00Z"), end: at("2026-11-11T00:00:00Z") })).toEqual({
      ok: false,
      reason: "outside_hours",
    });
  });

  it("rejects a trip on a day with no window", () => {
    const noSunday = weekdayRules.filter((rule) => rule.weekday !== 0);
    // Sunday 2026-11-08, 09:00 to 11:00 local
    expect(
      isAvailable({ ...base, rules: noSunday, start: at("2026-11-08T14:00:00Z"), end: at("2026-11-08T16:00:00Z") }),
    ).toEqual({ ok: false, reason: "outside_hours" });
  });

  it("accepts a trip across two back-to-back windows on the same day", () => {
    const split = [
      { weekday: 2, startMinutes: 8 * 60, endMinutes: 12 * 60 },
      { weekday: 2, startMinutes: 12 * 60, endMinutes: 18 * 60 },
    ];
    // Tuesday 2026-11-10, 11:00 to 13:00 local
    expect(isAvailable({ ...base, rules: split, start: at("2026-11-10T16:00:00Z"), end: at("2026-11-10T18:00:00Z") })).toEqual({
      ok: true,
    });
  });

  it("needs both days covered for a trip crossing midnight", () => {
    const late = weekdayRules.map((rule) => ({ ...rule, endMinutes: 24 * 60 }));
    // 23:00 to 01:00 local: the next day's window starts at 08:00, so it fails
    expect(isAvailable({ ...base, rules: late, start: at("2026-11-11T04:00:00Z"), end: at("2026-11-11T06:00:00Z") })).toEqual({
      ok: false,
      reason: "outside_hours",
    });
    const allDay = weekdayRules.map((rule) => ({ ...rule, startMinutes: 0, endMinutes: 24 * 60 }));
    expect(isAvailable({ ...base, rules: allDay, start: at("2026-11-11T04:00:00Z"), end: at("2026-11-11T06:00:00Z") })).toEqual({
      ok: true,
    });
  });

  it("returns paused before anything else", () => {
    expect(isAvailable({ ...base, paused: true, start: at("2026-11-10T14:00:00Z"), end: at("2026-11-10T16:00:00Z") })).toEqual({
      ok: false,
      reason: "paused",
    });
  });

  it("rejects any overlap with a multi-day block", () => {
    const blocks = [{ start: at("2026-11-09T05:00:00Z"), end: at("2026-11-12T05:00:00Z") }];
    expect(isAvailable({ ...base, blocks, start: at("2026-11-10T14:00:00Z"), end: at("2026-11-10T16:00:00Z") })).toEqual({
      ok: false,
      reason: "blocked",
    });
    expect(isAvailable({ ...base, blocks, start: at("2026-11-13T14:00:00Z"), end: at("2026-11-13T16:00:00Z") })).toEqual({ ok: true });
  });

  it("keeps a buffer around an accepted trip", () => {
    // Accepted: 09:00 to 12:00 local on 2026-11-10
    const accepted = [{ start: at("2026-11-10T14:00:00Z"), end: at("2026-11-10T17:00:00Z") }];
    // 12:20 local start is inside the 30-minute buffer
    expect(isAvailable({ ...base, accepted, start: at("2026-11-10T17:20:00Z"), end: at("2026-11-10T18:20:00Z") })).toEqual({
      ok: false,
      reason: "overlap",
    });
    // 12:31 local start clears it
    expect(isAvailable({ ...base, accepted, start: at("2026-11-10T17:31:00Z"), end: at("2026-11-10T18:31:00Z") })).toEqual({ ok: true });
  });
});
