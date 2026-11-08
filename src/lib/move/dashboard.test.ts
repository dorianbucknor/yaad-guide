import { describe, expect, it } from "vitest";

import { buildDashboard, type RequestRow } from "./dashboard";

const now = new Date("2026-11-08T18:00:00Z");
const hours = (h: number) => new Date(now.getTime() + h * 3_600_000).toISOString();

const row = (over: Partial<RequestRow>): RequestRow => ({
  id: "r",
  status: "pending",
  createdAt: hours(-48),
  respondBy: hours(5),
  respondedAt: null,
  pickupAt: hours(30),
  pickupName: "Montego Bay Airport",
  dropoffName: "Negril",
  partySize: 2,
  travelerFirstName: "Ana",
  amount: 100,
  currency: "usd",
  ...over,
});

describe("buildDashboard", () => {
  it("shows overdue pending requests as expired before the cron runs", () => {
    const data = buildDashboard([row({ id: "late", respondBy: hours(-1) })], now);
    expect(data.requests[0].status).toBe("expired");
    expect(data.counts.expired).toBe(1);
    expect(data.counts.pending).toBe(0);
  });

  it("counts only the last 30 days and keeps the deadline", () => {
    const data = buildDashboard(
      [row({ id: "a" }), row({ id: "old", status: "declined", createdAt: hours(-24 * 40) })],
      now,
    );
    expect(data.counts.pending).toBe(1);
    expect(data.counts.declined).toBe(0);
    expect(data.requests.find((r) => r.id === "a")?.respondBy).toBe(hours(5));
  });

  it("gives a 14-day series ending today with in-time answers", () => {
    const data = buildDashboard(
      [row({ status: "accepted", createdAt: hours(-2), respondedAt: hours(-1), respondBy: hours(10) })],
      now,
    );
    expect(data.answeredSeries).toHaveLength(14);
    expect(data.answeredSeries[13]).toMatchObject({ day: "2026-11-08", received: 1, inTime: 1 });
  });

  it("sums earnings from accepted and completed requests by currency", () => {
    const data = buildDashboard(
      [
        row({ status: "accepted", pickupAt: hours(24), amount: 80 }),
        row({ status: "completed", pickupAt: hours(-24), amount: 50 }),
        row({ status: "completed", pickupAt: hours(-24 * 20), amount: 20 }),
        row({ status: "declined", amount: 999 }),
        row({ status: "completed", pickupAt: hours(-24), amount: 7000, currency: "jmd" }),
      ],
      now,
    );
    expect(data.earnings.upcoming).toEqual({ usd: 80, jmd: 0 });
    expect(data.earnings.last7Days).toEqual({ usd: 50, jmd: 7000 });
    expect(data.earnings.last30Days).toEqual({ usd: 70, jmd: 7000 });
  });

  it("has no response rate under five requests", () => {
    expect(buildDashboard([row({})], now).responseRate).toBeNull();
  });
});
