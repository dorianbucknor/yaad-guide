"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type HoursWindow = { weekday: number; startMinutes: number; endMinutes: number };

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

function TimeSelect({
  name,
  items,
  value,
  onChange,
}: {
  name: string;
  items: { value: string; label: string }[];
  value: number;
  onChange: (minutes: number) => void;
}): React.JSX.Element {
  return (
    <Select
      items={items}
      value={String(value)}
      onValueChange={(next) => {
        if (next) onChange(Number(next));
      }}
    >
      <SelectTrigger aria-label={name} className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="w-auto min-w-(--anchor-width)">
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** The weekly schedule: one block per day, each with any number of from-to windows. */
export function HoursEditor({
  windows,
  onChange,
}: {
  windows: readonly HoursWindow[];
  onChange: (next: HoursWindow[]) => void;
}): React.JSX.Element {
  const update = (index: number, change: Partial<HoursWindow>): void =>
    onChange(windows.map((w, i) => (i === index ? { ...w, ...change } : w)));

  return (
    <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
      {ORDER.map((weekday) => {
        const rows = windows.map((w, index) => ({ w, index })).filter(({ w }) => w.weekday === weekday);
        return (
          <li key={weekday} className="grid gap-3 p-4 sm:grid-cols-[8rem_1fr] sm:items-start">
            <h3 className="min-h-9 text-sm font-medium leading-9">{DAYS[weekday]}</h3>
            <div className="flex flex-col gap-3">
              {rows.length === 0 ? <p className="min-h-9 text-sm leading-9 text-muted-foreground">Not available</p> : null}
              {rows.map(({ w, index }) => (
                <div key={index} className="flex flex-wrap items-center gap-3">
                  <TimeSelect
                    name={`${DAYS[weekday]} from`}
                    items={START_ITEMS}
                    value={w.startMinutes}
                    onChange={(startMinutes) => update(index, { startMinutes })}
                  />
                  <span aria-hidden className="text-sm text-muted-foreground">
                    to
                  </span>
                  <TimeSelect
                    name={`${DAYS[weekday]} until`}
                    items={END_ITEMS}
                    value={w.endMinutes}
                    onChange={(endMinutes) => update(index, { endMinutes })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${DAYS[weekday]} ${label(w.startMinutes)} to ${label(w.endMinutes)}`}
                    onClick={() => onChange(windows.filter((_, i) => i !== index))}
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
                onClick={() => onChange([...windows, { weekday, startMinutes: 360, endMinutes: 1080 }])}
              >
                <PlusIcon aria-hidden /> Add hours
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
