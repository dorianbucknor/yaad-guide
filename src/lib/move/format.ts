import type { Currency } from "./types";

export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount);
}

/** "2h 15m left", "40m left" or "Overdue", from milliseconds until the deadline. */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "Overdue";
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m left`;
}

const plural = (n: number, unit: string, many: string): string => `${n} ${n === 1 ? unit : many}`;

/** "in 48 mins", "in 5 hrs" or "in 4 days" for a pickup under a week away; null otherwise. */
export function formatTimeUntil(ms: number): string | null {
  if (ms <= 0 || ms >= 7 * 86_400_000) return null;
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `in ${plural(minutes, "min", "mins")}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${plural(hours, "hr", "hrs")}`;
  return `in ${plural(Math.floor(hours / 24), "day", "days")}`;
}

export const STATUS_LABEL = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  completed: "Completed",
  cancelled: "Cancelled",
} as const;
