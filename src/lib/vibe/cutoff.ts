export type CutoffUnit = "minutes" | "hours" | "days";

const PER_UNIT: Record<CutoffUnit, number> = { minutes: 1, hours: 60, days: 1440 };

/** The largest unit that divides the cutoff evenly, for showing it to a vendor. */
export function splitCutoff(minutes: number): { value: number; unit: CutoffUnit } {
  if (minutes > 0 && minutes % PER_UNIT.days === 0) return { value: minutes / PER_UNIT.days, unit: "days" };
  if (minutes > 0 && minutes % PER_UNIT.hours === 0) return { value: minutes / PER_UNIT.hours, unit: "hours" };
  return { value: minutes, unit: "minutes" };
}

export function toCutoffMinutes(value: number, unit: CutoffUnit): number {
  return value * PER_UNIT[unit];
}
