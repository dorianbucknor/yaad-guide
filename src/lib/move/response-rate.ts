import { MOVE_CONFIG } from "./config";

export type RateRequest = {
  status: string;
  createdAt: Date;
  respondedAt: Date | null;
  respondBy: Date;
};

const DAY_MS = 86_400_000;

/**
 * Share of requests answered before their deadline over the last 90 days.
 * Null until the vendor has received enough requests to mean something.
 */
export function responseRate(requests: readonly RateRequest[], now: Date): number | null {
  const since = now.getTime() - MOVE_CONFIG.responseRateDays * DAY_MS;
  const recent = requests.filter((r) => r.createdAt.getTime() >= since);
  if (recent.length < MOVE_CONFIG.responseRateMinRequests) return null;
  const inTime = recent.filter((r) => r.respondedAt !== null && r.respondedAt <= r.respondBy).length;
  return inTime / recent.length;
}
