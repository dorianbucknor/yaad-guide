"use client";

import { Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Legend, MonthGrid, MonthNav, pickDay, type DayCell, type DayRange } from "@/components/calendar/month-grid";
import { RangeActions } from "@/components/calendar/range-actions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/skeleton";
import { useIsClient } from "@/hooks/use-is-client";
import { blockRangeAction, unblockRangeAction } from "@/lib/move/actions";
import { DAY_MS, jamaicaDayStart, localDayOf } from "@/lib/move/time";
import { shiftMonth } from "@/lib/vibe/calendar";

import { useSave } from "./use-save";

export type CalendarTrip = {
  id: string;
  day: string;
  status: "accepted" | "pending";
  pickupAt: string;
  from: string;
  to: string;
  party: number;
  who: string;
  quote: string;
};
export type CalendarBlock = {
  id: string;
  startsAt: string;
  endsAt: string;
  note: string | null;
};

const toDate = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const nextDay = (day: string) =>
  localDayOf(new Date(jamaicaDayStart(day).getTime() + DAY_MS));

/** Every Jamaica day a blocked range touches. */
function daysOf(block: CalendarBlock): string[] {
  const end = new Date(block.endsAt).getTime();
  const days: string[] = [];
  for (
    let day = localDayOf(new Date(block.startsAt));
    jamaicaDayStart(day).getTime() < end;
    day = nextDay(day)
  ) {
    days.push(day);
    if (days.length > 400) break;
  }
  return days;
}

const fmt = (day: string) =>
  toDate(day).toLocaleDateString("en-JM", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

export function BlockedCalendar({
  blocks,
  trips,
}: {
  blocks: CalendarBlock[];
  trips: CalendarTrip[];
}): React.JSX.Element {
  const isClient = useIsClient();
  const { pending, run } = useSave();
  const [selected, setSelected] = useState<DayRange | null>(null);
  const [month, setMonth] = useState(() => localDayOf(new Date()).slice(0, 7));

  const blockedSet = useMemo(() => new Set(blocks.flatMap(daysOf)), [blocks]);
  const tripsByDay = useMemo(() => {
    const byDay = new Map<string, CalendarTrip[]>();
    for (const t of trips) byDay.set(t.day, [...(byDay.get(t.day) ?? []), t]);
    return byDay;
  }, [trips]);

  const today = localDayOf(new Date());
  const bookings = [...trips]
    .filter((t) => (selected ? t.day >= selected.from && t.day <= selected.to : t.day >= today))
    .sort((a, b) => a.pickupAt.localeCompare(b.pickupAt));

  if (!isClient) return <Skeleton className="h-[40rem] w-full rounded-2xl" aria-busy="true" />;

  const act = (action: typeof blockRangeAction, success: string) => {
    if (!selected) return;
    run(
      () =>
        action({
          startsAt: jamaicaDayStart(selected.from).toISOString(),
          endsAt: jamaicaDayStart(nextDay(selected.to)).toISOString(),
        }),
      { success, onDone: () => setSelected(null) },
    );
  };

  const cellFor = (day: string): DayCell => {
    const list = tripsByDay.get(day) ?? [];
    const booked = list.filter((t) => t.status === "accepted").length;
    const waiting = list.length - booked;
    if (blockedSet.has(day)) return { label: "blocked", lines: ["Blocked"], tone: "closed" };
    const lines = [booked > 0 ? `${booked} booked` : "", waiting > 0 ? `${waiting} waiting` : ""].filter(Boolean);
    if (lines.length === 0) return { label: "nothing booked" };
    return { label: lines.join(", "), lines, tone: booked > 0 ? "booked" : "waiting" };
  };

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,40rem)_minmax(0,34rem)]">
      <div className="flex min-w-0 flex-col gap-4">
        <MonthNav
          month={month}
          prev={() => setMonth((m) => shiftMonth(m, -1))}
          today={() => setMonth(today.slice(0, 7))}
          next={() => setMonth((m) => shiftMonth(m, 1))}
        />
        <MonthGrid month={month} today={today} minDay={today} selected={selected} onPick={(day) => setSelected((cur) => pickDay(cur, day))} cellFor={cellFor} />
        <Legend
          items={[
            { tone: "closed", text: "blocked" },
            { tone: "booked", text: "booked trip" },
            { tone: "waiting", text: "waiting for your answer" },
          ]}
        />
        <RangeActions selected={selected} pending={pending} onBlock={() => act(blockRangeAction, "Dates blocked")} onFree={() => act(unblockRangeAction, "Dates freed")} />
      </div>

      <div className="flex min-w-0 flex-col gap-8">
        <section
          className="flex min-w-0 flex-col gap-3"
          aria-labelledby="bookings-heading"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="bookings-heading" className="text-lg font-semibold">
              Bookings
            </h2>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {selected
                ? selected.from === selected.to
                  ? fmt(selected.from)
                  : `${fmt(selected.from)} to ${fmt(selected.to)}`
                : "From today"}
            </p>
          </div>
          {bookings.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              {selected
                ? "No bookings on the selected days."
                : "No bookings coming up."}
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Trip</TableHead>
                    <TableHead className="text-right">Party</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-normal tabular-nums">
                        {fmt(t.day)},{" "}
                        {new Date(t.pickupAt).toLocaleTimeString("en-JM", {
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: "America/Jamaica",
                        })}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <span className="font-medium">
                          {t.from} to {t.to}
                        </span>
                        <span className="block text-muted-foreground">
                          {t.who} · {t.quote}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {t.party}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            t.status === "accepted"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {t.status === "accepted" ? "Booked" : "Waiting"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <section
          className="flex min-w-0 flex-col gap-3"
          aria-labelledby="blocked-heading"
        >
          <h2 id="blocked-heading" className="text-lg font-semibold">
            Blocked dates
          </h2>
          {blocks.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Nothing blocked.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dates</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Free</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blocks.map((block) => {
                    const days = daysOf(block);
                    const first = days[0];
                    const last = days[days.length - 1];
                    const text =
                      first === last
                        ? fmt(first)
                        : `${fmt(first)} to ${fmt(last)}`;
                    return (
                      <TableRow key={block.id}>
                        <TableCell className="whitespace-normal tabular-nums">
                          {text}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {days.length}
                        </TableCell>
                        <TableCell className="max-w-32 truncate text-muted-foreground">
                          {block.note ?? ""}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={pending}
                            aria-label={`Free ${text}`}
                            onClick={() =>
                              run(
                                () =>
                                  unblockRangeAction({
                                    startsAt: block.startsAt,
                                    endsAt: block.endsAt,
                                  }),
                                { success: "Dates freed" },
                              )
                            }
                          >
                            <Trash2Icon aria-hidden />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
