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
