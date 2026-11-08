"use client";

import { useMemo, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PlaceRow } from "@/lib/move/queries";

/** Pick places from the list, grouped by parish, with a filter box. */
export function PlacePicker({
  places,
  selected,
  onChange,
  disabled,
}: {
  places: readonly PlaceRow[];
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
}): React.JSX.Element {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const shown = places.filter((p) => !q || p.name.toLowerCase().includes(q) || p.parish.toLowerCase().includes(q));
    const byParish = new Map<string, PlaceRow[]>();
    for (const place of shown) byParish.set(place.parish, [...(byParish.get(place.parish) ?? []), place]);
    return [...byParish.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [places, query]);

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="place-filter">Find a place</FieldLabel>
        <Input
          id="place-filter"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or parish"
        />
      </Field>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {selected.size} {selected.size === 1 ? "place" : "places"} chosen
      </p>
      {groups.length === 0 ? <p className="text-sm text-muted-foreground">No places match.</p> : null}
      {groups.map(([parish, list]) => (
        <fieldset key={parish} className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-medium">{parish}</legend>
          {list.map((place) => (
            <Field key={place.id} orientation="horizontal" className="min-h-11 md:min-h-9">
              <Checkbox
                id={`place-${place.id}`}
                checked={selected.has(place.id)}
                disabled={disabled}
                onCheckedChange={(checked) => toggle(place.id, checked === true)}
              />
              <FieldLabel htmlFor={`place-${place.id}`} className="font-normal">
                {place.name}
              </FieldLabel>
            </Field>
          ))}
        </fieldset>
      ))}
    </div>
  );
}
