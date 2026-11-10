"use client";

import { Button } from "@/components/ui/button";

import type { DayRange } from "./month-grid";

const dayText = (day: string): string =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-JM", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });

/** What is selected, and the two things you can do with it: block those dates or free them. */
export function RangeActions({
  selected,
  pending,
  onBlock,
  onFree,
}: {
  selected: DayRange | null;
  pending: boolean;
  onBlock: () => void;
  onFree: () => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm" aria-live="polite">
        {selected
          ? selected.from === selected.to
            ? `Selected ${dayText(selected.from)}`
            : `Selected ${dayText(selected.from)} to ${dayText(selected.to)}`
          : "Pick a day, or a first and last day."}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" size="lg" disabled={!selected || pending} onClick={onBlock}>
          Block these dates
        </Button>
        <Button type="button" size="lg" variant="outline" disabled={!selected || pending} onClick={onFree}>
          Free these dates
        </Button>
      </div>
    </div>
  );
}
