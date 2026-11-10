"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Legend, MonthGrid, MonthNav, pickDay, type DayCell, type DayRange } from "@/components/calendar/month-grid";
import { RangeActions } from "@/components/calendar/range-actions";
import { ItemSelect, type Item } from "@/components/move/item-select";
import { useSave } from "@/components/move/use-save";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toJamaica } from "@/lib/move/time";
import { addSlotAction, deleteSlotAction, editSlotAction, setDatesClosedAction } from "@/lib/vibe/actions";
import { groupRuns, groupSlotsByDay, shiftMonth } from "@/lib/vibe/calendar";
import { jamaicaToIso, minutesLabel } from "@/lib/vibe/time";
import type { VibeSlot } from "@/lib/vibe/types";

const TIME_ITEMS: Item[] = Array.from({ length: 48 }, (_, i) => ({ value: String(i * 30), label: minutesLabel(i * 30) }));
const dayLabel = new Intl.DateTimeFormat("en-JM", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const at = (day: string): Date => new Date(`${day}T00:00:00Z`);
const timeOf = (slot: VibeSlot): string => minutesLabel(toJamaica(new Date(slot.startsAt)).minutes);

function SlotRow({ slot }: { slot: VibeSlot }): React.JSX.Element {
  const { pending, run } = useSave();
  const [capacity, setCapacity] = useState(String(slot.capacity));
  const [open, setOpen] = useState(slot.status === "open");
  const [error, setError] = useState<string | undefined>();
  const changed = Number(capacity) !== slot.capacity || open !== (slot.status === "open");

  return (
    <li className="flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-16 flex-col">
          <span className="text-lg font-semibold tabular-nums">{timeOf(slot)}</span>
          <span className="text-sm text-muted-foreground tabular-nums">{slot.booked} booked</span>
        </div>
        <Field className="w-28">
          <FieldLabel htmlFor={`cap-${slot.id}`}>Capacity</FieldLabel>
          <Input
            id={`cap-${slot.id}`}
            type="number"
            inputMode="numeric"
            min={Math.max(1, slot.booked)}
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
          />
        </Field>
        <Field orientation="horizontal" className="w-auto">
          <Switch id={`open-${slot.id}`} checked={open} onCheckedChange={setOpen} />
          <FieldLabel htmlFor={`open-${slot.id}`}>{open ? "Open" : "Closed"}</FieldLabel>
        </Field>
        <Button
          type="button"
          variant="outline"
          disabled={pending || !changed}
          onClick={() =>
            run(() => editSlotAction({ id: slot.id, capacity: Number(capacity), status: open ? "open" : "closed" }), {
              success: "Saved",
              onFail: (result) => setError(result.error),
              onDone: () => setError(undefined),
            })
          }
        >
          {pending ? "Saving…" : "Save"}
        </Button>
        {slot.source === "one_off" && slot.booked === 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove the ${timeOf(slot)} slot`}
            disabled={pending}
            onClick={() => run(() => deleteSlotAction(slot.id), { success: "Slot removed" })}
          >
            <Trash2Icon aria-hidden />
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </li>
  );
}

function AddSlot({ listingId, day }: { listingId: string; day: string }): React.JSX.Element {
  const { pending, run } = useSave();
  const [minutes, setMinutes] = useState("600");
  const [capacity, setCapacity] = useState("20");
  const [error, setError] = useState<string | undefined>();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-32">
          <ItemSelect id="day-slot-time" label="New slot at" items={TIME_ITEMS} value={minutes} onChange={setMinutes} />
        </div>
        <Field className="w-28">
          <FieldLabel htmlFor="day-slot-capacity">Capacity</FieldLabel>
          <Input id="day-slot-capacity" type="number" inputMode="numeric" min={1} value={capacity} onChange={(event) => setCapacity(event.target.value)} />
        </Field>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(() => addSlotAction(listingId, { startsAt: jamaicaToIso(day, Number(minutes)), capacity: Number(capacity) }), {
              success: "Slot added",
              onFail: (result) => setError(result.fieldErrors ? Object.values(result.fieldErrors)[0] : result.error),
              onDone: () => setError(undefined),
            })
          }
        >
          {pending ? "Adding…" : "Add slot"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Card({ id, title, children }: { id: string; title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 md:p-5">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Insights({ booked, cancellations }: { booked: number; cancellations: number | null }): React.JSX.Element {
  return (
    <Card id="insights-heading" title="Next 7 days">
      <dl className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1 rounded-xl bg-muted/50 p-4">
          <dt className="text-sm text-muted-foreground">Booked</dt>
          <dd className="text-3xl font-semibold tabular-nums">{booked}</dd>
          <dd className="text-xs text-muted-foreground">Tickets and seats across your slots</dd>
        </div>
        <div className="flex flex-col gap-1 rounded-xl bg-muted/50 p-4">
          <dt className="text-sm text-muted-foreground">Cancellations</dt>
          <dd className="text-3xl font-semibold tabular-nums">{cancellations ?? "None yet"}</dd>
          {cancellations === null ? <dd className="text-xs text-muted-foreground">Counted once travelers can book</dd> : null}
        </div>
      </dl>
    </Card>
  );
}

const shortDay = (day: string): string =>
  new Intl.DateTimeFormat("en-JM", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(at(day));

function BlockedDates({ days, pending, onFree }: { days: string[]; pending: boolean; onFree: (run: { from: string; to: string }) => void }): React.JSX.Element {
  const runs = groupRuns(days);
  return (
    <Card id="blocked-heading" title="Blocked dates">
      {runs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Nothing blocked.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dates</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Free</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => {
                const text = run.from === run.to ? shortDay(run.from) : `${shortDay(run.from)} to ${shortDay(run.to)}`;
                const count = Math.round((Date.parse(run.to) - Date.parse(run.from)) / 86_400_000) + 1;
                return (
                  <TableRow key={run.from}>
                    <TableCell className="whitespace-normal tabular-nums">{text}</TableCell>
                    <TableCell className="text-right tabular-nums">{count}</TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" disabled={pending} aria-label={`Free ${text}`} onClick={() => onFree(run)}>
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
    </Card>
  );
}

/**
 * Month view of one listing: pick days to block or free them, see the next seven days, and (when the listing
 * takes slots) change or add the slots on a day.
 */
export function SlotCalendar({
  listingId,
  listings,
  month,
  today,
  slots,
  blockedDays,
  weekBooked,
  usesSlots,
}: {
  listingId: string;
  listings: { id: string; title: string }[];
  month: string;
  today: string;
  slots: VibeSlot[];
  /** Every closed day from the start of this month, or today if earlier, to a year ahead. */
  blockedDays: string[];
  weekBooked: number;
  usesSlots: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const { pending, run } = useSave();
  const byDay = groupSlotsByDay(slots);
  const blocked = new Set(blockedDays);
  const [selected, setSelected] = useState<DayRange | null>(null);
  const link = (m: string): string => `/v/vibe/calendar?listing=${listingId}&month=${m}`;
  const slotDay = selected?.from ?? (today.startsWith(month) ? today : `${month}-01`);
  const daySlots = byDay.get(slotDay) ?? [];

  const change = (range: { from: string; to: string }, closed: boolean): void =>
    run(() => setDatesClosedAction(listingId, { ...range, closed }), {
      success: closed ? "Dates blocked" : "Dates freed",
      onDone: () => setSelected(null),
    });

  const cellFor = (day: string): DayCell => {
    const list = byDay.get(day) ?? [];
    const booked = list.reduce((sum, s) => sum + s.booked, 0);
    const capacity = list.reduce((sum, s) => sum + s.capacity, 0);
    if (blocked.has(day)) return { label: "blocked", lines: ["Blocked"], tone: "closed" };
    if (list.length === 0) return { label: "no slots" };
    return {
      label: `${list.length} slot${list.length === 1 ? "" : "s"}, ${booked} of ${capacity} booked`,
      lines: [list.length === 1 ? "1 slot" : `${list.length} slots`, `${booked}/${capacity} booked`],
      tone: booked > 0 ? "booked" : undefined,
    };
  };

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,40rem)_minmax(0,34rem)]">
      <div className="flex min-w-0 flex-col gap-4">
        {listings.length > 1 ? (
          <div className="max-w-sm">
            <ItemSelect
              id="calendar-listing"
              label="Listing"
              items={listings.map((l) => ({ value: l.id, label: l.title }))}
              value={listingId}
              onChange={(id) => router.push(`/v/vibe/calendar?listing=${id}&month=${month}`)}
            />
          </div>
        ) : null}
        <MonthNav month={month} prev={link(shiftMonth(month, -1))} today={link(today.slice(0, 7))} next={link(shiftMonth(month, 1))} />
        <MonthGrid month={month} today={today} minDay={today} selected={selected} onPick={(day) => setSelected((cur) => pickDay(cur, day))} cellFor={cellFor} />
        <Legend
          items={[
            { tone: "closed", text: "blocked" },
            { tone: "booked", text: "has bookings" },
          ]}
        />
        <RangeActions selected={selected} pending={pending} onBlock={() => selected && change(selected, true)} onFree={() => selected && change(selected, false)} />
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <Insights booked={weekBooked} cancellations={null} />
        {usesSlots ? (
          <Card id="day-heading" title={`Slots on ${dayLabel.format(at(slotDay))}`}>
            {blocked.has(slotDay) ? <p className="text-sm text-muted-foreground">This day is blocked, so weekly slots will not be created for it.</p> : null}
            {daySlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No slots on this day.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
                {daySlots.map((slot) => (
                  <SlotRow key={`${slot.id}-${slot.capacity}-${slot.status}`} slot={slot} />
                ))}
              </ul>
            )}
            <AddSlot key={slotDay} listingId={listingId} day={slotDay} />
          </Card>
        ) : null}
        <BlockedDates days={blockedDays} pending={pending} onFree={(r) => change(r, false)} />
      </div>
    </div>
  );
}
