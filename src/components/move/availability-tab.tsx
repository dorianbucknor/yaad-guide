"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { saveAvailabilityAction } from "@/lib/move/actions";
import type { MoveListingView } from "@/lib/move/queries";

import { ItemSelect } from "./item-select";
import { NEED_LISTING_TEXT } from "./listing-payload";
import { useSave } from "./use-save";

type Window = { weekday: number; startMinutes: number; endMinutes: number };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Monday first reads naturally for a work week.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

const label = (minutes: number): string => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const times = (from: number, to: number) =>
  Array.from({ length: Math.floor((to - from) / 30) + 1 }, (_, i) => {
    const m = from + i * 30;
    return { value: String(m), label: label(m) };
  });
const START_ITEMS = times(0, 1410);
const END_ITEMS = times(30, 1440);

export function AvailabilityTab({ view }: { view: MoveListingView }): React.JSX.Element {
  const { pending, run } = useSave();
  const [windows, setWindows] = useState<Window[]>(() =>
    view.windows.map(({ weekday, startMinutes, endMinutes }) => ({ weekday, startMinutes, endMinutes })),
  );
  const [error, setError] = useState<string | undefined>();

  if (!view.listing) return <p className="text-muted-foreground">{NEED_LISTING_TEXT}</p>;

  const update = (index: number, change: Partial<Window>) =>
    setWindows((all) => all.map((w, i) => (i === index ? { ...w, ...change } : w)));

  return (
    <div className="flex flex-col gap-8">
      <p className="max-w-[65ch] text-sm text-muted-foreground">
        Hours you take trips each week, in Jamaica time. Block specific dates on the Calendar page.
      </p>
      {ORDER.map((weekday) => {
        const rows = windows.map((w, index) => ({ w, index })).filter(({ w }) => w.weekday === weekday);
        return (
          <section key={weekday} className="flex flex-col gap-3" aria-labelledby={`day-${weekday}`}>
            <h2 id={`day-${weekday}`} className="text-base font-medium">
              {DAYS[weekday]}
            </h2>
            {rows.length === 0 ? <p className="text-sm text-muted-foreground">Not available</p> : null}
            {rows.map(({ w, index }) => (
              <div key={index} className="flex flex-wrap items-end gap-3">
                <div className="w-32">
                  <ItemSelect
                    id={`start-${index}`}
                    label={`${DAYS[weekday]} from`}
                    items={START_ITEMS}
                    value={String(w.startMinutes)}
                    onChange={(v) => update(index, { startMinutes: Number(v) })}
                  />
                </div>
                <div className="w-32">
                  <ItemSelect
                    id={`end-${index}`}
                    label={`${DAYS[weekday]} until`}
                    items={END_ITEMS}
                    value={String(w.endMinutes)}
                    onChange={(v) => update(index, { endMinutes: Number(v) })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${DAYS[weekday]} ${label(w.startMinutes)} to ${label(w.endMinutes)}`}
                  onClick={() => setWindows((all) => all.filter((_, i) => i !== index))}
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
              onClick={() => setWindows((all) => [...all, { weekday, startMinutes: 360, endMinutes: 1080 }])}
            >
              <PlusIcon aria-hidden /> Add hours
            </Button>
          </section>
        );
      })}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        className="self-start"
        disabled={pending}
        onClick={() =>
          run(() => saveAvailabilityAction({ windows }), {
            success: "Hours saved",
            onFail: (r) => setError(r.error),
            onDone: () => setError(undefined),
          })
        }
      >
        {pending ? "Saving…" : "Save hours"}
      </Button>
    </div>
  );
}
