"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { ItemSelect, type Item } from "@/components/move/item-select";
import { useSave } from "@/components/move/use-save";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { addSlotAction, clearAutoSlotsAction, saveScheduleAction } from "@/lib/vibe/actions";
import { VIBE_CONFIG } from "@/lib/vibe/config";
import { WEEKDAYS, WEEKDAY_ORDER, jamaicaToIso, minutesLabel } from "@/lib/vibe/time";
import type { VibeListingView } from "@/lib/vibe/types";

type Row = { weekday: number; startMinutes: number; capacity: string; validFrom: string; validUntil: string };

const TIME_ITEMS: Item[] = Array.from({ length: 48 }, (_, i) => ({ value: String(i * 30), label: minutesLabel(i * 30) }));

function WeeklyPattern({ listing }: { listing: VibeListingView }): React.JSX.Element {
  const { pending, run } = useSave();
  const [auto, setAuto] = useState(listing.autoGenerateSlots);
  const [rows, setRows] = useState<Row[]>(() =>
    listing.rules.map((r) => ({
      weekday: r.weekday,
      startMinutes: r.startMinutes,
      capacity: String(r.capacity),
      validFrom: r.validFrom ?? "",
      validUntil: r.validUntil ?? "",
    })),
  );
  const [error, setError] = useState<string | undefined>();

  const update = (index: number, change: Partial<Row>): void =>
    setRows((all) => all.map((row, i) => (i === index ? { ...row, ...change } : row)));

  const save = (): void =>
    run(
      () =>
        saveScheduleAction(listing.id, {
          autoGenerate: auto,
          rules: rows.map((row) => ({
            weekday: row.weekday,
            startMinutes: row.startMinutes,
            capacity: row.capacity === "" ? Number.NaN : Number(row.capacity),
            validFrom: row.validFrom || null,
            validUntil: row.validUntil || null,
          })),
        }),
      {
        success: "Schedule saved",
        onFail: (result) => setError(result.fieldErrors ? Object.values(result.fieldErrors)[0] : result.error),
        onDone: () => setError(undefined),
      },
    );

  return (
    <section aria-labelledby="weekly-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="weekly-heading" className="text-xl font-semibold">
          Weekly schedule
        </h2>
        <p className="max-w-[65ch] text-sm text-muted-foreground">
          Times are Jamaica time. Each weekly time becomes bookable slots for the next {VIBE_CONFIG.slotWindowDays} days, and the window moves
          forward every day.
        </p>
      </div>

      <Field orientation="horizontal">
        <Switch id="auto-generate" checked={auto} disabled={pending} onCheckedChange={setAuto} />
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor="auto-generate">Create slots from the weekly schedule</FieldLabel>
          <FieldDescription>
            Turn this off to add every slot yourself. Slots that already exist stay, and you can still add slots by hand.
          </FieldDescription>
        </div>
      </Field>

      {WEEKDAY_ORDER.map((weekday) => {
        const dayRows = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.weekday === weekday);
        return (
          <section key={weekday} aria-labelledby={`day-${weekday}`} className="flex flex-col gap-3">
            <h3 id={`day-${weekday}`} className="text-base font-medium">
              {WEEKDAYS[weekday]}
            </h3>
            {dayRows.length === 0 ? <p className="text-sm text-muted-foreground">No slots</p> : null}
            {dayRows.map(({ row, index }) => (
              <div key={index} className="flex flex-wrap items-end gap-3">
                <div className="w-32">
                  <ItemSelect
                    id={`time-${index}`}
                    label={`${WEEKDAYS[weekday]} start`}
                    items={TIME_ITEMS}
                    value={String(row.startMinutes)}
                    onChange={(value) => update(index, { startMinutes: Number(value) })}
                  />
                </div>
                <Field className="w-28">
                  <FieldLabel htmlFor={`capacity-${index}`}>Capacity</FieldLabel>
                  <Input
                    id={`capacity-${index}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={row.capacity}
                    onChange={(event) => update(index, { capacity: event.target.value })}
                  />
                </Field>
                <Field className="w-40">
                  <FieldLabel htmlFor={`from-${index}`}>From (optional)</FieldLabel>
                  <Input id={`from-${index}`} type="date" value={row.validFrom} onChange={(event) => update(index, { validFrom: event.target.value })} />
                </Field>
                <Field className="w-40">
                  <FieldLabel htmlFor={`until-${index}`}>Until (optional)</FieldLabel>
                  <Input id={`until-${index}`} type="date" value={row.validUntil} onChange={(event) => update(index, { validUntil: event.target.value })} />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${WEEKDAYS[weekday]} ${minutesLabel(row.startMinutes)}`}
                  onClick={() => setRows((all) => all.filter((_, i) => i !== index))}
                >
                  <Trash2Icon aria-hidden />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setRows((all) => [...all, { weekday, startMinutes: 600, capacity: "20", validFrom: "", validUntil: "" }])}
            >
              <PlusIcon aria-hidden /> Add a time
            </Button>
          </section>
        );
      })}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="button" className="self-start" disabled={pending} onClick={save}>
        {pending ? "Saving…" : "Save schedule"}
      </Button>
    </section>
  );
}

function ManualSlot({ listing }: { listing: VibeListingView }): React.JSX.Element {
  const { pending, run } = useSave();
  const [day, setDay] = useState("");
  const [minutes, setMinutes] = useState("600");
  const [capacity, setCapacity] = useState("20");
  const [error, setError] = useState<string | undefined>();

  const add = (): void => {
    if (!day) {
      setError("Choose a date.");
      return;
    }
    run(() => addSlotAction(listing.id, { startsAt: jamaicaToIso(day, Number(minutes)), capacity: Number(capacity) }), {
      success: "Slot added",
      onFail: (result) => setError(result.fieldErrors ? Object.values(result.fieldErrors)[0] : result.error),
      onDone: () => setError(undefined),
    });
  };

  return (
    <section aria-labelledby="manual-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 id="manual-heading" className="text-xl font-semibold">
          Add a slot by hand
        </h2>
        <p className="max-w-[65ch] text-sm text-muted-foreground">
          For a one-off event or an extra time. This works whether or not the weekly schedule creates slots.
        </p>
      </div>
      <FieldGroup>
        <div className="flex flex-wrap items-end gap-3">
          <Field className="w-44" data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="slot-day">Date</FieldLabel>
            <Input id="slot-day" type="date" value={day} onChange={(event) => setDay(event.target.value)} />
          </Field>
          <div className="w-32">
            <ItemSelect id="slot-time" label="Start" items={TIME_ITEMS} value={minutes} onChange={setMinutes} />
          </div>
          <Field className="w-28">
            <FieldLabel htmlFor="slot-capacity">Capacity</FieldLabel>
            <Input id="slot-capacity" type="number" inputMode="numeric" min={1} value={capacity} onChange={(event) => setCapacity(event.target.value)} />
          </Field>
          <Button type="button" variant="outline" disabled={pending} onClick={add}>
            {pending ? "Adding…" : "Add slot"}
          </Button>
        </div>
        {error ? <FieldError>{error}</FieldError> : null}
      </FieldGroup>
    </section>
  );
}

function ClearSlots({ listing }: { listing: VibeListingView }): React.JSX.Element {
  const { pending, run } = useSave();
  const [confirm, setConfirm] = useState(false);

  return (
    <section aria-labelledby="clear-heading" className="flex flex-col gap-3">
      <h2 id="clear-heading" className="text-xl font-semibold">
        Clear automatic slots
      </h2>
      <p className="max-w-[65ch] text-sm text-muted-foreground">
        Removes every upcoming slot the weekly schedule created that has no bookings. Slots with bookings and slots you added by hand stay.
        There are {listing.futureOpenSlotCount} open slots ahead right now.
      </p>
      {confirm ? (
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => run(() => clearAutoSlotsAction(listing.id), { success: "Slots cleared", onDone: () => setConfirm(false) })}
          >
            {pending ? "Clearing…" : "Yes, clear them"}
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirm(false)}>
            Keep them
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="self-start" onClick={() => setConfirm(true)}>
          Clear automatic slots
        </Button>
      )}
    </section>
  );
}

export function ScheduleTab({ listing }: { listing: VibeListingView }): React.JSX.Element {
  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <WeeklyPattern listing={listing} />
      <ManualSlot listing={listing} />
      <ClearSlots listing={listing} />
    </div>
  );
}
