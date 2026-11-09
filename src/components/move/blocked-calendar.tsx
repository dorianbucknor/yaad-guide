"use client";

import { Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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

const pad = (n: number) => String(n).padStart(2, "0");
/** The calendar's own date (browser-local midnight) as `YYYY-MM-DD`. */
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
  const [range, setRange] = useState<DateRange | undefined>();

  const blockedDays = useMemo(
    () => blocks.flatMap(daysOf).map(toDate),
    [blocks],
  );
  const accepted = useMemo(
    () =>
      trips.filter((t) => t.status === "accepted").map((t) => toDate(t.day)),
    [trips],
  );
  const pendingTrips = useMemo(
    () => trips.filter((t) => t.status === "pending").map((t) => toDate(t.day)),
    [trips],
  );

  const today = localDayOf(new Date());
  const bookings = [...trips]
    .filter((t) =>
      range?.from
        ? t.day >= dayKey(range.from) && t.day <= dayKey(range.to ?? range.from)
        : t.day >= today,
    )
    .sort((a, b) => a.pickupAt.localeCompare(b.pickupAt));

  if (!isClient)
    return (
      <Skeleton className="h-[40rem] w-full rounded-2xl" aria-busy="true" />
    );

  const selected = range?.from
    ? { from: dayKey(range.from), to: dayKey(range.to ?? range.from) }
    : null;
  const payload = selected
    ? {
        startsAt: jamaicaDayStart(selected.from).toISOString(),
        endsAt: jamaicaDayStart(nextDay(selected.to)).toISOString(),
      }
    : null;
  const act = (action: typeof blockRangeAction, success: string) => {
    if (payload)
      run(() => action(payload), {
        success,
        onDone: () => setRange(undefined),
      });
  };

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,28rem)_minmax(0,34rem)]">
      <div className="flex min-w-0 flex-col gap-4">
        <Calendar
          mode="range"
          selected={range}
          onSelect={setRange}
          disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
          modifiers={{ blocked: blockedDays, accepted, pending: pendingTrips }}
          modifiersClassNames={{
            blocked: "[&>button]:bg-muted [&>button]:line-through",
            accepted:
              "[&>button]:bg-destructive [&>button]:font-bold [&>button]:text-destructive-foreground [&>button]:hover:bg-destructive/90",
            pending:
              "[&>button]:bg-secondary [&>button]:font-semibold [&>button]:text-secondary-foreground",
          }}
          className="w-full rounded-2xl border border-border p-3 [--cell-size:--spacing(11)] sm:p-4 md:[--cell-size:--spacing(10)] [&_button[data-day]]:aspect-auto [&_button[data-day]]:size-full [&_button[data-day]]:items-center [&_button[data-day]]:justify-center [&_button[data-day]]:text-center [&_button[data-day]]:text-base"
          classNames={{
            root: "w-full",
            month_caption:
              "flex h-12 w-full items-center justify-center px-12 text-lg font-semibold",
            weekday:
              "flex-1 text-sm font-medium text-muted-foreground select-none",
          }}
        />
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="inline-flex size-6 items-center justify-center rounded-md bg-muted line-through">
              12
            </span>{" "}
            blocked
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-flex size-6 items-center justify-center rounded-md bg-destructive font-bold text-destructive-foreground">
              12
            </span>{" "}
            booked trip
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-flex size-6 items-center justify-center rounded-md bg-secondary font-semibold text-secondary-foreground">
              12
            </span>{" "}
            waiting for your answer
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
          <Button
            type="button"
            size="lg"
            disabled={!payload || pending}
            onClick={() => act(blockRangeAction, "Dates blocked")}
          >
            Block these dates
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={!payload || pending}
            onClick={() => act(unblockRangeAction, "Dates freed")}
          >
            Free these dates
          </Button>
        </div>
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
