"use client";

import { useState } from "react";

import { ItemSelect, type Item } from "@/components/move/item-select";
import { useSave } from "@/components/move/use-save";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { businessHoursSetSchema } from "@/lib/schemas/dining";
import { saveBusinessHoursAction } from "@/lib/vibe/dining-actions";
import { WEEKDAYS, WEEKDAY_ORDER, minutesLabel } from "@/lib/vibe/time";
import type { VibeListingView } from "@/lib/vibe/types";

const OPEN_ITEMS: Item[] = Array.from({ length: 96 }, (_, i) => ({ value: String(i * 15), label: minutesLabel(i * 15) }));
// Hours cannot pass midnight, so the latest closing time is the last minute of the day.
const CLOSE_ITEMS: Item[] = [...OPEN_ITEMS.slice(1), { value: "1439", label: "23:59" }];

type Day = { open: boolean; opens: number; closes: number };

/** One row per day: open or closed, and when. Days left closed are not saved. */
export function HoursTab({ listing }: { listing: VibeListingView }): React.JSX.Element {
  const { pending, run } = useSave();
  const [days, setDays] = useState<Day[]>(() =>
    WEEKDAYS.map((_, weekday) => {
      const saved = listing.businessHours.find((row) => row.weekday === weekday);
      return saved
        ? { open: true, opens: saved.opensMinutes, closes: saved.closesMinutes }
        : { open: false, opens: 9 * 60, closes: 17 * 60 };
    }),
  );
  const [error, setError] = useState<string | null>(null);

  const update = (weekday: number, patch: Partial<Day>): void =>
    setDays((all) => all.map((day, index) => (index === weekday ? { ...day, ...patch } : day)));

  const save = (): void => {
    const rows = WEEKDAY_ORDER.filter((weekday) => days[weekday].open).map((weekday) => ({
      weekday,
      opensMinutes: days[weekday].opens,
      closesMinutes: days[weekday].closes,
    }));
    const parsed = businessHoursSetSchema.safeParse(rows);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the opening hours.");
      return;
    }
    setError(null);
    run(() => saveBusinessHoursAction(listing.id, parsed.data), {
      success: "Hours saved",
      onFail: (result) => setError(result.error),
    });
  };

  return (
    <section aria-labelledby="hours-heading" className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="hours-heading" className="text-xl font-semibold">
          Opening hours
        </h2>
        <p className="max-w-[65ch] text-sm text-muted-foreground">
          Times are Jamaica time. Travelers see these hours on your listing. Hours can&apos;t run past midnight, so for a late night enter
          the hours up to 23:59 and start the next day at 00:15.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {WEEKDAY_ORDER.map((weekday) => {
          const day = days[weekday];
          return (
            <li key={weekday} className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <Field orientation="horizontal" className="min-h-11 w-44 items-center gap-3 md:min-h-9">
                <Switch id={`open-${weekday}`} checked={day.open} onCheckedChange={(open) => update(weekday, { open })} />
                <FieldLabel htmlFor={`open-${weekday}`}>{WEEKDAYS[weekday]}</FieldLabel>
              </Field>
              {day.open ? (
                <>
                  <div className="w-28">
                    <ItemSelect
                      id={`opens-${weekday}`}
                      label={`${WEEKDAYS[weekday]} opens`}
                      items={OPEN_ITEMS}
                      value={String(day.opens)}
                      onChange={(value) => update(weekday, { opens: Number(value) })}
                    />
                  </div>
                  <div className="w-28">
                    <ItemSelect
                      id={`closes-${weekday}`}
                      label={`${WEEKDAYS[weekday]} closes`}
                      items={CLOSE_ITEMS}
                      value={String(day.closes)}
                      onChange={(value) => update(weekday, { closes: Number(value) })}
                    />
                  </div>
                </>
              ) : (
                <span className="min-h-9 text-sm leading-9 text-muted-foreground">Closed</span>
              )}
            </li>
          );
        })}
      </ul>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="button" className="self-start" disabled={pending} onClick={save}>
        {pending ? "Saving…" : "Save hours"}
      </Button>
    </section>
  );
}
