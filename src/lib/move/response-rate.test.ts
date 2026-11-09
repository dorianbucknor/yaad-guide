import { describe, expect, it } from "vitest";

import { responseRate } from "./response-rate";

const now = new Date("2026-11-10T12:00:00Z");
const daysAgo = (days: number): Date => new Date(now.getTime() - days * 86_400_000);
const hoursAfter = (date: Date, hours: number): Date => new Date(date.getTime() + hours * 3_600_000);

function request(daysOld: number, answeredAfterHours: number | null, windowHours = 24) {
  const createdAt = daysAgo(daysOld);
  return {
    status: answeredAfterHours === null ? "expired" : "accepted",
    createdAt,
    respondedAt: answeredAfterHours === null ? null : hoursAfter(createdAt, answeredAfterHours),
    respondBy: hoursAfter(createdAt, windowHours),
  };
}

describe("responseRate", () => {
  it("is null below five requests", () => {
    expect(responseRate([request(1, 1), request(2, 1), request(3, 1), request(4, 1)], now)).toBeNull();
  });

  it("counts answers made before the deadline", () => {
    const rate = responseRate([request(1, 1), request(2, 2), request(3, 3), request(4, 4), request(5, 5)], now);
    expect(rate).toBe(1);
  });

  it("does not count expired or late answers", () => {
    const rate = responseRate(
      [request(1, 1), request(2, 1), request(3, null), request(4, 30), request(5, 2)],
      now,
    );
    expect(rate).toBe(0.6);
  });

  it("ignores requests older than 90 days", () => {
    const rate = responseRate(
      [request(1, 1), request(2, 1), request(3, 1), request(4, 1), request(5, 1), request(120, null)],
      now,
    );
    expect(rate).toBe(1);
  });
});
