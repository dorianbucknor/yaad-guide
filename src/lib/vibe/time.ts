import { jamaicaDayStart } from "@/lib/move/time";

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
/** Monday first reads naturally for a work week. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** The UTC instant of a Jamaica calendar day (`YYYY-MM-DD`) at minutes since local midnight. */
export function jamaicaToIso(day: string, minutes: number): string {
  return new Date(jamaicaDayStart(day).getTime() + minutes * 60_000).toISOString();
}

/** A 24-hour clock label for minutes since midnight. */
export function minutesLabel(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
