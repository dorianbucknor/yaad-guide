import { describe, expect, it } from "vitest";

import { responseDeadline } from "./deadline";

const now = new Date("2026-11-10T12:00:00Z");
const inHours = (hours: number): Date => new Date(now.getTime() + hours * 3_600_000);
const hoursBetween = (a: Date, b: Date): number => (b.getTime() - a.getTime()) / 3_600_000;

describe("responseDeadline", () => {
  it("gives 24 hours when the pickup is days away", () => {
    expect(hoursBetween(now, responseDeadline(now, inHours(72))!)).toBe(24);
  });

  it("gives half the time left when that is shorter", () => {
    expect(hoursBetween(now, responseDeadline(now, inHours(10))!)).toBe(5);
  });

  it("never gives less than one hour", () => {
    expect(hoursBetween(now, responseDeadline(now, inHours(2))!)).toBe(1);
  });

  it("returns null when the pickup is under two hours away", () => {
    expect(responseDeadline(now, inHours(1.5))).toBeNull();
  });
});
