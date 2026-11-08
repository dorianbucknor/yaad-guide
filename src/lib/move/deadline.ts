import { MOVE_CONFIG } from "./config";

const HOUR_MS = 3_600_000;

/**
 * When a vendor must answer: 24 hours, or half the time left before pickup if that
 * is shorter, and never under 1 hour. Null when the pickup is too close to request.
 */
export function responseDeadline(now: Date, pickupAt: Date): Date | null {
  const hoursLeft = (pickupAt.getTime() - now.getTime()) / HOUR_MS;
  if (hoursLeft < MOVE_CONFIG.minLeadHours) return null;
  const hours = Math.max(
    MOVE_CONFIG.minResponseHours,
    Math.min(MOVE_CONFIG.maxResponseHours, hoursLeft / 2),
  );
  return new Date(now.getTime() + hours * HOUR_MS);
}
