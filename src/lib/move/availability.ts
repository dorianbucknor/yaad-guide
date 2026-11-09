import { DAY_MS, JAMAICA_OFFSET_MS, toJamaica } from "./time";

export type Rule = { weekday: number; startMinutes: number; endMinutes: number };
export type Span = { start: Date; end: Date };

export type AvailabilityInput = {
  paused: boolean;
  rules: readonly Rule[];
  blocks: readonly Span[];
  accepted: readonly Span[];
  start: Date;
  end: Date;
  bufferMinutes: number;
};

export type AvailabilityResult =
  | { ok: true }
  | { ok: false; reason: "paused" | "outside_hours" | "blocked" | "overlap" };

/** True when the day's windows (which may touch end to end) cover from..to. */
function windowsCover(rules: readonly Rule[], weekday: number, from: number, to: number): boolean {
  let cursor = from;
  const day = rules.filter((rule) => rule.weekday === weekday).sort((a, b) => a.startMinutes - b.startMinutes);
  for (const rule of day) {
    if (rule.startMinutes <= cursor && rule.endMinutes > cursor) cursor = rule.endMinutes;
  }
  return cursor >= to;
}

/** Splits start..end at local midnights and checks each piece against that day's windows. */
function withinWeeklyHours(rules: readonly Rule[], start: Date, end: Date): boolean {
  let cursor = start.getTime();
  const endMs = end.getTime();
  while (cursor < endMs) {
    const local = cursor - JAMAICA_OFFSET_MS;
    const dayStart = Math.floor(local / DAY_MS) * DAY_MS;
    const segmentEnd = Math.min(endMs, dayStart + DAY_MS + JAMAICA_OFFSET_MS);
    const fromMinutes = (local - dayStart) / 60_000;
    const toMinutes = (segmentEnd - JAMAICA_OFFSET_MS - dayStart) / 60_000;
    if (!windowsCover(rules, toJamaica(new Date(cursor)).weekday, fromMinutes, toMinutes)) return false;
    cursor = segmentEnd;
  }
  return true;
}

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean =>
  aStart < bEnd && aEnd > bStart;

export function isAvailable(input: AvailabilityInput): AvailabilityResult {
  const start = input.start.getTime();
  const end = input.end.getTime();
  if (input.paused) return { ok: false, reason: "paused" };
  if (!withinWeeklyHours(input.rules, input.start, input.end)) return { ok: false, reason: "outside_hours" };
  if (input.blocks.some((b) => overlaps(start, end, b.start.getTime(), b.end.getTime()))) {
    return { ok: false, reason: "blocked" };
  }
  const buffer = input.bufferMinutes * 60_000;
  if (input.accepted.some((a) => overlaps(start, end, a.start.getTime() - buffer, a.end.getTime() + buffer))) {
    return { ok: false, reason: "overlap" };
  }
  return { ok: true };
}
