"use client";

import { useState, useSyncExternalStore } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";

const CATEGORIES = [
  { label: "Stay", value: "stay" },
  { label: "Move", value: "move" },
  { label: "Vibe", value: "vibe" },
];

const subscribe = () => () => {};

/**
 * True in the browser, false on the server. The calendar reads the current date
 * internally, which Next's Cache Components rejects during prerender, so it is
 * rendered on the client only. Reuse this pattern for any date-based component.
 */
function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/** Form controls on one page, so their size can be checked at mobile and desktop widths. */
export function ControlsDemo() {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const isClient = useIsClient();

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="demo-name">Full name</Label>
          <Input id="demo-name" placeholder="Name on the booking" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="demo-category">Category</Label>
          <Select items={CATEGORIES} defaultValue="stay">
            <SelectTrigger id="demo-category" className="w-full sm:w-56">
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Checkbox id="demo-terms" />
          <Label htmlFor="demo-terms">I accept the cancellation policy</Label>
        </div>

        <RadioGroup defaultValue="moderate" aria-label="Cancellation policy">
          {["flexible", "moderate", "strict"].map((policy) => (
            <div key={policy} className="flex items-center gap-3">
              <RadioGroupItem id={`demo-${policy}`} value={policy} />
              <Label htmlFor={`demo-${policy}`} className="capitalize">
                {policy}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex items-center gap-3">
          <Switch id="demo-sponsored" />
          <Label htmlFor="demo-sponsored">Show sponsored listings first</Label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Toggle aria-label="Verified only">Verified only</Toggle>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              Sort by
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Price, low to high</DropdownMenuItem>
              <DropdownMenuItem>Rating</DropdownMenuItem>
              <DropdownMenuItem>Distance</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Tabs defaultValue="stay">
          <TabsList>
            <TabsTrigger value="stay">Stay</TabsTrigger>
            <TabsTrigger value="move">Move</TabsTrigger>
            <TabsTrigger value="vibe">Vibe</TabsTrigger>
          </TabsList>
        </Tabs>

        <Accordion>
          <AccordionItem value="policy">
            <AccordionTrigger>Cancellation policy</AccordionTrigger>
            <AccordionContent>
              Free cancellation until 24 hours before check-in.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="min-h-[352px]">
        {isClient ? (
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-2xl border border-border"
          />
        ) : null}
      </div>
    </div>
  );
}
