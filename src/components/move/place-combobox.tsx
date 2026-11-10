"use client";

import { ChevronsUpDownIcon, GlobeIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PlaceRow } from "@/lib/move/queries";

import { ALL_ISLAND } from "./coverage-draft";

/**
 * A search box over the places in the database, with All Island at the top. Places already chosen are
 * left out, so every row you can pick is new.
 */
export function PlaceCombobox({
  id,
  places,
  chosen,
  allIslandChosen,
  onPick,
  disabled,
}: {
  id: string;
  places: readonly PlaceRow[];
  chosen: ReadonlySet<string>;
  allIslandChosen: boolean;
  onPick: (id: string) => void;
  disabled?: boolean;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const available = places.filter((place) => !chosen.has(place.id));

  const pick = (value: string): void => {
    onPick(value);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || allIslandChosen}
            className="w-full justify-between font-normal"
          />
        }
      >
        <span className="truncate text-muted-foreground">
          {allIslandChosen ? "All Island covers every place" : "Search for a place to add"}
        </span>
        <ChevronsUpDownIcon aria-hidden className="opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) min-w-64 p-0">
        <Command>
          <CommandInput placeholder="Type a place or parish" />
          <CommandList>
            <CommandEmpty>No place matches. Suggest it in the box beside this list.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="All Island whole island every parish" onSelect={() => pick(ALL_ISLAND)}>
                <GlobeIcon aria-hidden />
                <span className="font-medium">All Island</span>
                <span className="text-muted-foreground">Every parish</span>
              </CommandItem>
              {available.map((place) => (
                <CommandItem key={place.id} value={`${place.name} ${place.parish}`} onSelect={() => pick(place.id)}>
                  <span>{place.name}</span>
                  <span className="text-muted-foreground">{place.parish}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
