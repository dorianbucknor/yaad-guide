"use client";

import { LockIcon, PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { useSave } from "@/components/move/use-save";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CUISINE_MAX, diningDetailsSchema } from "@/lib/schemas/dining";
import { saveDiningDetailsAction } from "@/lib/vibe/dining-actions";
import type { BookingMode, PriceTier, ReservationStyle, VenueType, VibeListingView } from "@/lib/vibe/types";

const VENUE_CHOICES: readonly [VenueType, string, string][] = [
  ["street_food", "Street food", "A stall, cart or truck."],
  ["cookshop", "Cookshop", "A casual spot with a counter or a few tables."],
  ["restaurant", "Restaurant", "A sit-down venue, takeout or both."],
];

const MODE_CHOICES: readonly [BookingMode, string, string][] = [
  ["reservation", "Reservations", "Travelers reserve a table. You choose below whether that is by time slot or just your opening hours."],
  ["prepaid", "Prepaid experience", "Travelers pay up front for a set menu, tasting or tour, like a ticketed event."],
  ["listing_only", "Listing only", "Travelers add you to their itinerary and pay you in person. No booking, no commission."],
];

const STYLE_CHOICES: readonly [ReservationStyle, string, string][] = [
  ["slotted", "Time slots", "You set the times and how many guests each takes."],
  ["hours_only", "Opening hours only", "Travelers see when you are open. No capacity to manage."],
];

const TIERS: readonly PriceTier[] = ["$", "$$", "$$$"];

type Errors = Partial<Record<"venueType" | "dineIn" | "cuisineTypes" | "priceTier" | "bookingMode" | "reservationStyle", string>>;

/** A radio with a name and a sentence, laid out like the choices on the Basics and Cancellation tabs. */
function Choice({
  group,
  value,
  name,
  hint,
  disabled,
}: {
  group: string;
  value: string;
  name: string;
  hint: string;
  disabled?: boolean;
}): React.JSX.Element {
  const id = `${group}-${value}`;
  return (
    <Field orientation="horizontal" className="items-start gap-3 rounded-xl border border-border bg-card p-4" data-disabled={disabled ? true : undefined}>
      <RadioGroupItem value={value} id={id} className="mt-1" />
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor={id} className="text-base">
          {name}
        </FieldLabel>
        <FieldDescription>{hint}</FieldDescription>
      </div>
    </Field>
  );
}

/**
 * What kind of venue this is and how travelers will book it. Venue type, cuisines and price can change
 * any time. The booking mode and reservation style are chosen once: after the first save the database
 * refuses a change, because tickets, slots and hours depend on them.
 */
export function DiningDetailsTab({ listing }: { listing: VibeListingView }): React.JSX.Element {
  const saved = listing.diningProfile;
  const locked = saved !== null;
  const { pending, run } = useSave();

  const [venueType, setVenueType] = useState<VenueType | "">(saved?.venueType ?? "");
  const [dineIn, setDineIn] = useState(saved?.dineIn ?? false);
  const [takeout, setTakeout] = useState(saved?.takeout ?? false);
  const [cuisines, setCuisines] = useState<string[]>(saved?.cuisineTypes ?? []);
  const [cuisineDraft, setCuisineDraft] = useState("");
  const [priceTier, setPriceTier] = useState<PriceTier | "">(saved?.priceTier ?? "");
  const [bookingMode, setBookingMode] = useState<BookingMode | "">(saved?.bookingMode ?? "");
  const [style, setStyle] = useState<ReservationStyle | "">(saved?.reservationStyle ?? "");
  const [errors, setErrors] = useState<Errors>({});

  const addCuisine = (): void => {
    const name = cuisineDraft.trim();
    if (name === "") return;
    if (!cuisines.some((c) => c.toLowerCase() === name.toLowerCase())) setCuisines((all) => [...all, name]);
    setCuisineDraft("");
  };

  const save = (): void => {
    const parsed = diningDetailsSchema.safeParse({
      venueType: venueType === "" ? undefined : venueType,
      dineIn: venueType === "restaurant" ? dineIn : false,
      takeout: venueType === "restaurant" ? takeout : false,
      cuisineTypes: cuisines,
      priceTier: priceTier === "" ? null : priceTier,
      bookingMode: bookingMode === "" ? undefined : bookingMode,
      reservationStyle: bookingMode === "reservation" ? (style === "" ? null : style) : null,
    });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    run(() => saveDiningDetailsAction(listing.id, parsed.data), { success: "Details saved" });
  };

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <FieldGroup>
        <FieldSet>
          <FieldLegend variant="label">What kind of place is it?</FieldLegend>
          <RadioGroup value={venueType} onValueChange={(v) => setVenueType(v as VenueType)} className="gap-3">
            {VENUE_CHOICES.map(([value, name, hint]) => (
              <Choice key={value} group="venue" value={value} name={name} hint={hint} />
            ))}
          </RadioGroup>
          {errors.venueType ? <FieldError>{errors.venueType}</FieldError> : null}
        </FieldSet>

        {venueType === "restaurant" ? (
          <FieldSet>
            <FieldLegend variant="label">How do guests get their food?</FieldLegend>
            <div className="flex flex-wrap gap-6">
              <Field orientation="horizontal" className="w-auto gap-2">
                <Checkbox id="dine-in" checked={dineIn} onCheckedChange={(checked) => setDineIn(checked === true)} />
                <FieldLabel htmlFor="dine-in">Dine-in</FieldLabel>
              </Field>
              <Field orientation="horizontal" className="w-auto gap-2">
                <Checkbox id="takeout" checked={takeout} onCheckedChange={(checked) => setTakeout(checked === true)} />
                <FieldLabel htmlFor="takeout">Takeout</FieldLabel>
              </Field>
            </div>
            {errors.dineIn ? <FieldError>{errors.dineIn}</FieldError> : <FieldDescription>Choose at least one.</FieldDescription>}
          </FieldSet>
        ) : null}

        <Field data-invalid={errors.cuisineTypes ? true : undefined}>
          <FieldLabel htmlFor="cuisine-draft">Cuisine (optional)</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="cuisine-draft"
              value={cuisineDraft}
              maxLength={40}
              placeholder="For example Jerk or Seafood"
              disabled={cuisines.length >= CUISINE_MAX}
              onChange={(event) => setCuisineDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCuisine();
                }
              }}
            />
            <Button type="button" variant="outline" disabled={cuisineDraft.trim() === "" || cuisines.length >= CUISINE_MAX} onClick={addCuisine}>
              <PlusIcon aria-hidden /> Add
            </Button>
          </div>
          {cuisines.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Cuisines added">
              {cuisines.map((name) => (
                <li key={name} className="flex items-center gap-1 rounded-full bg-brand-light/60 py-1 pl-3 pr-1 text-sm dark:bg-primary/20">
                  {name}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove ${name}`}
                    onClick={() => setCuisines((all) => all.filter((c) => c !== name))}
                  >
                    <XIcon aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          {errors.cuisineTypes ? (
            <FieldError>{errors.cuisineTypes}</FieldError>
          ) : (
            <FieldDescription>Up to {CUISINE_MAX}. Travelers use these to find you.</FieldDescription>
          )}
        </Field>

        <FieldSet>
          <FieldLegend variant="label">Price (optional)</FieldLegend>
          <RadioGroup value={priceTier} onValueChange={(v) => setPriceTier(v as PriceTier | "")} className="flex flex-wrap gap-6">
            {TIERS.map((tier) => (
              <Field key={tier} orientation="horizontal" className="w-auto gap-2">
                <RadioGroupItem value={tier} id={`tier-${tier}`} />
                <FieldLabel htmlFor={`tier-${tier}`}>{tier}</FieldLabel>
              </Field>
            ))}
          </RadioGroup>
          <FieldDescription>$ is cheap and casual. $$$ is a special occasion.</FieldDescription>
          {priceTier !== "" ? (
            <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setPriceTier("")}>
              Clear price
            </Button>
          ) : null}
        </FieldSet>

        <FieldSet>
          <FieldLegend variant="label">How will travelers book?</FieldLegend>
          {locked ? (
            <p className="flex max-w-[65ch] items-start gap-2 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
              <LockIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              This is locked once saved, because your tickets, schedule and hours depend on it. To change it, create a new listing.
            </p>
          ) : (
            <FieldDescription>You choose this once. Pick carefully, because it cannot be changed afterwards.</FieldDescription>
          )}
          <RadioGroup
            value={bookingMode}
            onValueChange={(v) => setBookingMode(v as BookingMode)}
            disabled={locked}
            className="gap-3"
          >
            {MODE_CHOICES.map(([value, name, hint]) => (
              <Choice key={value} group="mode" value={value} name={name} hint={hint} disabled={locked} />
            ))}
          </RadioGroup>
          {errors.bookingMode ? <FieldError>{errors.bookingMode}</FieldError> : null}
        </FieldSet>

        {bookingMode === "reservation" ? (
          <FieldSet>
            <FieldLegend variant="label">How do reservations work?</FieldLegend>
            <RadioGroup value={style} onValueChange={(v) => setStyle(v as ReservationStyle)} disabled={locked} className="gap-3">
              {STYLE_CHOICES.map(([value, name, hint]) => (
                <Choice key={value} group="style" value={value} name={name} hint={hint} disabled={locked} />
              ))}
            </RadioGroup>
            {errors.reservationStyle ? <FieldError>{errors.reservationStyle}</FieldError> : null}
          </FieldSet>
        ) : null}
      </FieldGroup>

      <Button type="button" className="self-start" disabled={pending} onClick={save}>
        {pending ? "Saving…" : "Save details"}
      </Button>
    </div>
  );
}
