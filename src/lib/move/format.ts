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

export const STATUS_LABEL = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  completed: "Completed",
  cancelled: "Cancelled",
} as const;
