import { localDayOf } from "@/lib/move/time";

import type { VibeSlot } from "./types";

const pad = (n: number): string => String(n).padStart(2, "0");

/** `YYYY-MM` shifted by a number of months. */
export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const index = year * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/** The first day, the first day of the next month (exclusive end), and how many days the month has. */
export function monthRange(month: string): { from: string; to: string; days: number } {
  const from = `${month}-01`;
  const to = `${shiftMonth(month, 1)}-01`;
  const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
  return { from, to, days };
}

/** Weeks of seven cells, Monday first; days outside the month are null. */
export function monthGrid(month: string): (string | null)[][] {
  const { from, days } = monthRange(month);
  const firstWeekday = new Date(`${from}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const lead = (firstWeekday + 6) % 7;
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => `${month}-${pad(i + 1)}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

/** Slots grouped by the Jamaica calendar day they start on, each day earliest first. */
export function groupSlotsByDay(slots: readonly VibeSlot[]): Map<string, VibeSlot[]> {
  const grouped = new Map<string, VibeSlot[]>();
  for (const slot of slots) {
    const day = localDayOf(new Date(slot.startsAt));
    grouped.set(day, [...(grouped.get(day) ?? []), slot]);
  }
  for (const list of grouped.values()) list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return grouped;
}

/** `YYYY-MM-DD` moved by whole days. */
export function addDays(day: string, delta: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10);
}

/** Runs of consecutive days, from sorted or unsorted days, as `{ from, to }` (both inclusive). */
export function groupRuns(days: readonly string[]): { from: string; to: string }[] {
  const runs: { from: string; to: string }[] = [];
  for (const day of [...new Set(days)].sort()) {
    const last = runs[runs.length - 1];
    if (last && addDays(last.to, 1) === day) last.to = day;
    else runs.push({ from: day, to: day });
  }
  return runs;
}
