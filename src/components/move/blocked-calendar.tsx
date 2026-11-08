"use client";

import { Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsClient } from "@/hooks/use-is-client";
import { blockRangeAction, unblockRangeAction } from "@/lib/move/actions";
import { DAY_MS, jamaicaDayStart, localDayOf } from "@/lib/move/time";

import { useSave } from "./use-save";

export type CalendarTrip = { day: string; status: "accepted" | "pending" };
export type CalendarBlock = { id: string; startsAt: string; endsAt: string; note: string | null };

const pad = (n: number) => String(n).padStart(2, "0");
/** The calendar's own date (browser-local midnight) as `YYYY-MM-DD`. */
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toDate = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const nextDay = (day: string) => localDayOf(new Date(jamaicaDayStart(day).getTime() + DAY_MS));

/** Every Jamaica day a blocked range touches. */
function daysOf(block: CalendarBlock): string[] {
  const end = new Date(block.endsAt).getTime();
  const days: string[] = [];
  for (let day = localDayOf(new Date(block.startsAt)); jamaicaDayStart(day).getTime() < end; day = nextDay(day)) {
    days.push(day);
    if (days.length > 400) break;
  }
  return days;
}

const fmt = (day: string) => toDate(day).toLocaleDateString("en-JM", { weekday: "short", day: "numeric", month: "short" });

export function BlockedCalendar({
  blocks,
  trips,
}: {
  blocks: CalendarBlock[];
  trips: CalendarTrip[];
}): React.JSX.Element {
  const isClient = useIsClient();
  const { pending, run } = useSave();
  const [range, setRange] = useState<DateRange | undefined>();

  const blockedDays = useMemo(() => blocks.flatMap(daysOf).map(toDate), [blocks]);
  const accepted = useMemo(() => trips.filter((t) => t.status === "accepted").map((t) => toDate(t.day)), [trips]);
  const pendingTrips = useMemo(() => trips.filter((t) => t.status === "pending").map((t) => toDate(t.day)), [trips]);

  if (!isClient) return <Skeleton className="h-80 w-full max-w-sm rounded-2xl" aria-busy="true" />;

  const selected = range?.from ? { from: dayKey(range.from), to: dayKey(range.to ?? range.from) } : null;
  const payload = selected
    ? { startsAt: jamaicaDayStart(selected.from).toISOString(), endsAt: jamaicaDayStart(nextDay(selected.to)).toISOString() }
    : null;
  const act = (action: typeof blockRangeAction, success: string) => {
    if (payload) run(() => action(payload), { success, onDone: () => setRange(undefined) });
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Calendar
          mode="range"
          selected={range}
          onSelect={setRange}
          disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
          modifiers={{ blocked: blockedDays, accepted, pending: pendingTrips }}
          modifiersClassNames={{
            blocked: "[&>button]:bg-muted [&>button]:line-through",
            accepted: "[&>button]:font-bold [&>button]:underline",
            pending: "[&>button]:italic [&>button]:ring-1 [&>button]:ring-foreground/40",
          }}
          className="self-start rounded-2xl border border-border"
        />
        <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <li>
            <span className="line-through">12</span> blocked
          </li>
          <li>
            <span className="font-bold underline">12</span> accepted trip
          </li>
          <li>
            <span className="italic">12</span> waiting for your answer
          </li>
        </ul>
        <p className="text-sm" aria-live="polite">
          {selected
            ? selected.from === selected.to
              ? `Selected ${fmt(selected.from)}`
              : `Selected ${fmt(selected.from)} to ${fmt(selected.to)}`
            : "Pick a day, or a first and last day."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" disabled={!payload || pending} onClick={() => act(blockRangeAction, "Dates blocked")}>
            Block these dates
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!payload || pending}
            onClick={() => act(unblockRangeAction, "Dates freed")}
          >
            Free these dates
          </Button>
        </div>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="blocked-heading">
        <h2 id="blocked-heading" className="text-lg font-semibold">
          Blocked dates
        </h2>
        {blocks.length === 0 ? <p className="text-sm text-muted-foreground">Nothing blocked.</p> : null}
        <ul className="flex flex-col gap-2">
          {blocks.map((block) => {
            const days = daysOf(block);
            const first = days[0];
            const last = days[days.length - 1];
            const text = first === last ? fmt(first) : `${fmt(first)} to ${fmt(last)}`;
            return (
              <li key={block.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2">
                <span className="text-sm tabular-nums">
                  {text}
                  {block.note ? <span className="text-muted-foreground"> · {block.note}</span> : null}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={pending}
                  aria-label={`Free ${text}`}
                  onClick={() =>
                    run(() => unblockRangeAction({ startsAt: block.startsAt, endsAt: block.endsAt }), { success: "Dates freed" })
                  }
                >
                  <Trash2Icon aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
