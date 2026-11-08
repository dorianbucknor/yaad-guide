// Jamaica is UTC-5 all year (no daylight saving), so a fixed offset is exact.
export const JAMAICA_OFFSET_MS = 5 * 3_600_000;
export const DAY_MS = 86_400_000;

/** Weekday (0 = Sunday), minutes since local midnight and the local date. */
export function toJamaica(date: Date): { weekday: number; minutes: number; day: string } {
  const local = new Date(date.getTime() - JAMAICA_OFFSET_MS);
  return {
    weekday: local.getUTCDay(),
    minutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
    day: local.toISOString().slice(0, 10),
  };
}

/** The instant a Jamaica calendar day (`YYYY-MM-DD`) begins. */
export function jamaicaDayStart(day: string): Date {
  return new Date(Date.parse(`${day}T00:00:00Z`) + JAMAICA_OFFSET_MS);
}

/** The Jamaica calendar day (`YYYY-MM-DD`) an instant falls on. */
export function localDayOf(date: Date): string {
  return toJamaica(date).day;
}
