import { responseRate } from "./response-rate";
import { DAY_MS, toJamaica } from "./time";
import type { Currency } from "./types";

export type RequestStatus = "pending" | "accepted" | "declined" | "expired" | "completed" | "cancelled";

export type RequestRow = {
  id: string;
  status: string;
  createdAt: string;
  respondBy: string;
  respondedAt: string | null;
  pickupAt: string;
  pickupId: string;
  dropoffId: string;
  pickupName: string;
  dropoffName: string;
  partySize: number;
  travelerFirstName: string;
  amount: number | null;
  currency: Currency | null;
};

export type DashboardRequest = Omit<RequestRow, "status"> & { status: RequestStatus };

export type Money = Record<Currency, number>;

export type DashboardData = {
  requests: DashboardRequest[];
  counts: Record<RequestStatus, number>;
  answeredSeries: { day: string; received: number; inTime: number }[];
  responseRate: number | null;
  earnings: Record<"upcoming" | "last7Days" | "last30Days" | "last180Days" | "last365Days", Money>;
};

const STATUSES: RequestStatus[] = ["pending", "accepted", "declined", "expired", "completed", "cancelled"];
const zeroCounts = () => Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<RequestStatus, number>;
const zeroMoney = (): Money => ({ usd: 0, jmd: 0 });

/** Pending requests past their deadline are expired, even before the cron has run. */
function effectiveStatus(row: RequestRow, now: Date): RequestStatus {
  if (row.status === "pending" && new Date(row.respondBy) < now) return "expired";
  return row.status as RequestStatus;
}

export function buildDashboard(rows: readonly RequestRow[], now: Date): DashboardData {
  const requests = rows.map((r) => ({ ...r, status: effectiveStatus(r, now) }));
  const since30 = now.getTime() - 30 * DAY_MS;
  const since7 = now.getTime() - 7 * DAY_MS;
  const since180 = now.getTime() - 180 * DAY_MS;
  const since365 = now.getTime() - 365 * DAY_MS;

  const counts = zeroCounts();
  for (const r of requests) if (new Date(r.createdAt).getTime() >= since30) counts[r.status] += 1;

  const today = toJamaica(now).day;
  const series = Array.from({ length: 14 }, (_, i) => {
    const day = toJamaica(new Date(now.getTime() - (13 - i) * DAY_MS)).day;
    return { day, received: 0, inTime: 0 };
  });
  for (const r of requests) {
    const bucket = series.find((s) => s.day === toJamaica(new Date(r.createdAt)).day);
    if (!bucket || bucket.day > today) continue;
    bucket.received += 1;
    if (r.respondedAt && new Date(r.respondedAt) <= new Date(r.respondBy)) bucket.inTime += 1;
  }

  const earnings: DashboardData["earnings"] = {
    upcoming: zeroMoney(),
    last7Days: zeroMoney(),
    last30Days: zeroMoney(),
    last180Days: zeroMoney(),
    last365Days: zeroMoney(),
  };
  for (const r of requests) {
    if (r.amount === null || r.currency === null) continue;
    const pickup = new Date(r.pickupAt).getTime();
    if (r.status === "accepted" && pickup >= now.getTime()) earnings.upcoming[r.currency] += r.amount;
    if (r.status === "completed" || r.status === "accepted") {
      if (pickup > now.getTime()) continue;
      if (pickup >= since365) earnings.last365Days[r.currency] += r.amount;
      if (pickup >= since180) earnings.last180Days[r.currency] += r.amount;
      if (pickup >= since30) earnings.last30Days[r.currency] += r.amount;
      if (pickup >= since7) earnings.last7Days[r.currency] += r.amount;
    }
  }

  // Same rule as the database: open requests that are not yet due do not count.
  const rateInput = requests
    .filter((r) => r.status !== "pending")
    .map((r) => ({
      status: r.status,
      createdAt: new Date(r.createdAt),
      respondedAt: r.respondedAt ? new Date(r.respondedAt) : null,
      respondBy: new Date(r.respondBy),
    }));

  return {
    requests,
    counts,
    answeredSeries: series,
    responseRate: responseRate(rateInput, now),
    earnings,
  };
}
