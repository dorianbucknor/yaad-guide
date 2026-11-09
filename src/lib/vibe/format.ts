import { splitCutoff } from "./cutoff";
import type { Currency } from "./types";

const PREFIX: Record<Currency, string> = { usd: "US$", jmd: "J$" };

/** "Free" for zero, otherwise the currency and two decimals. */
export function formatPrice(amount: number, currency: Currency): string {
  if (amount === 0) return "Free";
  return `${PREFIX[currency]}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return plural(rest, "minute");
  if (rest === 0) return plural(hours, "hour");
  return `${plural(hours, "hour")} ${plural(rest, "minute")}`;
}

/** How long before the start a booking closes, in words. */
export function formatCutoff(minutes: number): string {
  if (minutes === 0) return "until it starts";
  const { value, unit } = splitCutoff(minutes);
  return `${plural(value, unit.slice(0, -1))} before it starts`;
}
