"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { monthGrid } from "@/lib/vibe/calendar";
import { WEEKDAYS } from "@/lib/vibe/time";

const HEADERS = [1, 2, 3, 4, 5, 6, 0].map((d) => WEEKDAYS[d].slice(0, 3));
const monthLabel = new Intl.DateTimeFormat("en-JM", { timeZone: "UTC", month: "long", year: "numeric" });
const at = (day: string): Date => new Date(`${day}T00:00:00Z`);

/** How a day cell reads: shared by the grid and the legends so a colour means one thing everywhere. */
export type Tone = "closed" | "booked" | "waiting";
export const TONE_CLASS: Record<Tone, string> = {
  closed: "border-dashed border-muted-foreground/50 bg-muted text-muted-foreground",
  booked: "bg-success-subtle text-success-subtle-foreground",
  waiting: "bg-secondary text-secondary-foreground",
};

export type DayCell = {
  /** Spoken label for the day, without the date. */
  label: string;
  /** Up to two short lines shown under the day number. */
  lines?: string[];
  tone?: Tone;
};

/** The range a person picked: one day, or a first and last day. */
export type DayRange = { from: string; to: string };

/** One click on a day: starts a range, finishes it, or restarts it after it was finished. */
export function pickDay(current: DayRange | null, day: string): DayRange {
  if (current && current.from === current.to && day > current.from) return { from: current.from, to: day };
  return { from: day, to: day };
}

const inRange = (range: DayRange | null, day: string): boolean => Boolean(range && day >= range.from && day <= range.to);

type Step = string | (() => void);

function StepButton({ step, label, children }: { step: Step; label: string; children: React.ReactNode }): React.JSX.Element {
  return typeof step === "string" ? (
    <Link href={step} aria-label={label} className={buttonVariants({ variant: "outline", size: "icon" })}>
      {children}
    </Link>
  ) : (
    <Button type="button" variant="outline" size="icon" aria-label={label} onClick={step}>
      {children}
    </Button>
  );
}

/** Month title with previous, today and next. Each step is a link target or a click handler. */
export function MonthNav({ month, prev, today, next }: { month: string; prev: Step; today: Step; next: Step }): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold">{monthLabel.format(at(`${month}-01`))}</h2>
      <nav aria-label="Month" className="flex gap-2">
        <StepButton step={prev} label="Previous month">
          <ChevronLeftIcon aria-hidden />
        </StepButton>
        {typeof today === "string" ? (
          <Link href={today} className={buttonVariants({ variant: "outline" })}>
            Today
          </Link>
        ) : (
          <Button type="button" variant="outline" onClick={today}>
            Today
          </Button>
        )}
        <StepButton step={next} label="Next month">
          <ChevronRightIcon aria-hidden />
        </StepButton>
      </nav>
    </div>
  );
}

/** The month as a grid of day buttons, Monday first. Days before `minDay` cannot be picked. */
export function MonthGrid({
  month,
  today,
  minDay,
  selected,
  onPick,
  cellFor,
}: {
  month: string;
  today: string;
  minDay?: string;
  selected: DayRange | null;
  onPick: (day: string) => void;
  cellFor: (day: string) => DayCell;
}): React.JSX.Element {
  const dayName = new Intl.DateTimeFormat("en-JM", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="grid grid-cols-7 gap-1 md:gap-2">
      {HEADERS.map((name) => (
        <span key={name} aria-hidden className="pb-1 text-center text-sm text-muted-foreground">
          {name}
        </span>
      ))}
      {monthGrid(month)
        .flat()
        .map((day, index) => {
          if (!day) return <span key={`pad-${index}`} aria-hidden />;
          const cell = cellFor(day);
          const chosen = inRange(selected, day);
          const past = minDay !== undefined && day < minDay;
          return (
            <button
              key={day}
              type="button"
              disabled={past}
              aria-label={`${dayName.format(at(day))}, ${cell.label}`}
              aria-pressed={chosen}
              onClick={() => onPick(day)}
              className={cn(
                "flex min-h-14 flex-col items-start gap-0.5 rounded-lg border border-border bg-card p-1.5 text-left text-sm md:min-h-20 md:p-2",
                "focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40",
                cell.tone && TONE_CLASS[cell.tone],
                chosen && "border-primary bg-brand-light/40 text-foreground dark:bg-primary/20",
                day === today && "ring-2 ring-ring",
              )}
            >
              <span className={cn("font-medium tabular-nums", cell.tone === "closed" && "line-through")}>{Number(day.slice(8))}</span>
              <span aria-hidden className="flex flex-col text-xs tabular-nums">
                {(cell.lines ?? []).map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </span>
            </button>
          );
        })}
    </div>
  );
}

/** What each tone means, shown once under the grid. */
export function Legend({ items }: { items: { tone: Tone; text: string }[] }): React.JSX.Element {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
      {items.map(({ tone, text }) => (
        <li key={tone} className="flex items-center gap-2">
          <span className={cn("inline-flex size-6 items-center justify-center rounded-md border border-border text-xs", TONE_CLASS[tone])}>12</span>
          {text}
        </li>
      ))}
    </ul>
  );
}
