"use client";

import { ChevronLeftIcon, ChevronRightIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ItemSelect, type Item } from "@/components/move/item-select";
import { useSave } from "@/components/move/use-save";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toJamaica } from "@/lib/move/time";
import { addSlotAction, deleteSlotAction, editSlotAction, setDateClosedAction } from "@/lib/vibe/actions";
import { groupSlotsByDay, monthGrid, shiftMonth } from "@/lib/vibe/calendar";
import { WEEKDAYS, jamaicaToIso, minutesLabel } from "@/lib/vibe/time";
import type { VibeSlot } from "@/lib/vibe/types";
import { cn } from "@/lib/utils";

const TIME_ITEMS: Item[] = Array.from({ length: 48 }, (_, i) => ({ value: String(i * 30), label: minutesLabel(i * 30) }));
const HEADERS = [1, 2, 3, 4, 5, 6, 0].map((d) => WEEKDAYS[d].slice(0, 3));
const monthLabel = new Intl.DateTimeFormat("en-JM", { timeZone: "UTC", month: "long", year: "numeric" });
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

/** Month view of one listing's slots. Pick a day to change its slots, add one, or close the whole day. */
export function SlotCalendar({
  listingId,
  listings,
  month,
  today,
  slots,
  blockedDays,
}: {
  listingId: string;
  listings: { id: string; title: string }[];
  month: string;
  today: string;
  slots: VibeSlot[];
  blockedDays: string[];
}): React.JSX.Element {
  const router = useRouter();
  const { pending, run } = useSave();
  const byDay = groupSlotsByDay(slots);
  const blocked = new Set(blockedDays);
  const firstWithSlots = [...byDay.keys()].sort()[0];
  const [selected, setSelected] = useState<string>(today.startsWith(month) ? today : (firstWithSlots ?? `${month}-01`));
  const [closeError, setCloseError] = useState<string | undefined>();
  const link = (m: string): string => `/v/vibe/calendar?listing=${listingId}&month=${m}`;
  const daySlots = byDay.get(selected) ?? [];
  const closed = blocked.has(selected);

  return (
    <div className="flex flex-col gap-8">
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

      <section aria-labelledby="month-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="month-heading" className="text-xl font-semibold">
            {monthLabel.format(at(`${month}-01`))}
          </h2>
          <nav aria-label="Month" className="flex gap-2">
            <Link href={link(shiftMonth(month, -1))} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Previous month">
              <ChevronLeftIcon aria-hidden />
            </Link>
            <Link href={link(today.slice(0, 7))} className={buttonVariants({ variant: "outline" })}>
              Today
            </Link>
            <Link href={link(shiftMonth(month, 1))} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Next month">
              <ChevronRightIcon aria-hidden />
            </Link>
          </nav>
        </div>

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
              const list = byDay.get(day) ?? [];
              const isClosed = blocked.has(day);
              const booked = list.reduce((sum, s) => sum + s.booked, 0);
              const capacity = list.reduce((sum, s) => sum + s.capacity, 0);
              const label = `${dayLabel.format(at(day))}, ${isClosed ? "closed" : list.length === 0 ? "no slots" : `${list.length} slot${list.length === 1 ? "" : "s"}, ${booked} of ${capacity} booked`}`;
              return (
                <button
                  key={day}
                  type="button"
                  aria-label={label}
                  aria-pressed={day === selected}
                  onClick={() => {
                    setSelected(day);
                    setCloseError(undefined);
                  }}
                  className={cn(
                    "flex min-h-14 flex-col items-start gap-0.5 rounded-lg border border-border bg-card p-1.5 text-left text-sm md:min-h-20 md:p-2",
                    "focus-visible:outline-2 focus-visible:outline-ring",
                    day === selected && "border-primary bg-brand-light/40 dark:bg-primary/20",
                    day === today && "ring-2 ring-ring",
                    isClosed && "bg-muted text-muted-foreground",
                  )}
                >
                  <span className="font-medium tabular-nums">{Number(day.slice(8))}</span>
                  <span aria-hidden className="text-xs tabular-nums text-muted-foreground">
                    {isClosed ? "Closed" : list.length > 0 ? `${list.length} × ${booked}/${capacity}` : ""}
                  </span>
                </button>
              );
            })}
        </div>
      </section>

      <section aria-labelledby="day-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="day-heading" className="text-xl font-semibold">
            {dayLabel.format(at(selected))}
          </h2>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(() => setDateClosedAction(listingId, { day: selected, closed: !closed }), {
                success: closed ? "Day reopened" : "Day closed",
                onFail: (result) => setCloseError(result.error),
                onDone: () => setCloseError(undefined),
              })
            }
          >
            {closed ? "Reopen this day" : "Close this day"}
          </Button>
        </div>
        {closeError ? (
          <p role="alert" className="text-sm text-destructive">
            {closeError}
          </p>
        ) : null}
        {closed ? <p className="text-sm text-muted-foreground">This day is closed, so weekly slots will not be created for it.</p> : null}
        {daySlots.length === 0 ? (
          <p className="text-muted-foreground">No slots on this day.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
            {daySlots.map((slot) => (
              <SlotRow key={`${slot.id}-${slot.capacity}-${slot.status}`} slot={slot} />
            ))}
          </ul>
        )}
        <AddSlot key={selected} listingId={listingId} day={selected} />
      </section>
    </div>
  );
}
