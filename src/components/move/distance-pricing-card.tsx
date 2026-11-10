"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PencilIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { applyFailure } from "@/components/auth/apply-failure";
import { TextField } from "@/components/auth/text-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { saveListingAction } from "@/lib/move/actions";
import type { MoveListingView } from "@/lib/move/queries";
import { listingSchema } from "@/lib/schemas/move";

import { ItemSelect } from "./item-select";
import { listingPayload } from "./listing-payload";
import { useSave } from "./use-save";

const formulaSchema = listingSchema.pick({ currency: true, baseFare: true, perKm: true, hourlyRate: true });
// react-hook-form also runs the default values (numbers or null) through this.
const toNumber = (value: unknown): number | null =>
  typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : null;
const CURRENCY_ITEMS = [
  { value: "usd", label: "US dollars (USD)" },
  { value: "jmd", label: "Jamaican dollars (JMD)" },
];

type Listing = NonNullable<MoveListingView["listing"]>;

const money = (listing: Listing, amount: number | null): string =>
  amount === null ? "Not set" : `${listing.currency === "jmd" ? "J$" : "$"}${amount.toFixed(2)}`;

function EditForm({ view, onDone }: { view: MoveListingView; onDone: () => void }): React.JSX.Element {
  const { pending, run } = useSave();
  const listing = view.listing as Listing;
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formulaSchema),
    defaultValues: {
      currency: listing.currency,
      baseFare: listing.baseFare,
      perKm: listing.perKm,
      hourlyRate: listing.hourlyRate,
    },
  });

  const save = handleSubmit((values) =>
    run(() => saveListingAction(listingPayload(view, values)), {
      success: "Prices saved",
      onFail: (result) => applyFailure(result, setError),
      onDone,
    }),
  );

  return (
    <form onSubmit={save} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Edit price by distance</DialogTitle>
        <DialogDescription>Travelers see the estimate before they ask. A flat rate between two places replaces it.</DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Controller
          control={control}
          name="currency"
          render={({ field }) => (
            <ItemSelect
              id="currency"
              label="Currency"
              items={CURRENCY_ITEMS}
              value={field.value}
              onChange={field.onChange}
              error={errors.currency?.message}
            />
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="base-fare"
            label="Base fare"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            error={errors.baseFare?.message}
            {...register("baseFare", { setValueAs: toNumber })}
          />
          <TextField
            id="per-km"
            label="Price per kilometre"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            error={errors.perKm?.message}
            {...register("perKm", { setValueAs: toNumber })}
          />
        </div>
        <TextField
          id="hourly-rate"
          label="Hourly rate for hire (optional)"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          description="Offered when a traveler wants you for several hours."
          error={errors.hourlyRate?.message}
          {...register("hourlyRate", { setValueAs: toNumber })}
        />
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save prices"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** The distance formula as a summary: what it is now, whether it is on, and a way to change either. */
export function DistancePricingCard({ view }: { view: MoveListingView }): React.JSX.Element {
  const { pending, run } = useSave();
  const [editing, setEditing] = useState(false);
  const listing = view.listing as Listing;

  const configured = listing.baseFare !== null && listing.perKm !== null;
  const on = listing.distancePricingEnabled;
  const toggle = (next: boolean): void =>
    run(() => saveListingAction(listingPayload(view, { distancePricingEnabled: next })), {
      success: next ? "Price by distance is on" : "Price by distance is off",
    });

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 md:p-5" aria-labelledby="distance-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="distance-heading" className="text-lg font-semibold">
          Price by distance
        </h2>
        <Badge variant={on && configured ? "default" : "outline"}>{on && configured ? "On" : "Off"}</Badge>
      </div>
      <p className="max-w-[65ch] text-sm text-muted-foreground">
        Used for any trip without a flat rate. Travelers see the estimate before they ask.
      </p>

      {configured ? (
        <dl className="grid grid-cols-3 gap-4 rounded-xl bg-muted/50 p-4">
          <div>
            <dt className="text-xs text-muted-foreground">Base fare</dt>
            <dd className="text-base font-semibold tabular-nums">{money(listing, listing.baseFare)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Per kilometre</dt>
            <dd className="text-base font-semibold tabular-nums">{money(listing, listing.perKm)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Hourly hire</dt>
            <dd className="text-base font-semibold tabular-nums">{money(listing, listing.hourlyRate)}</dd>
          </div>
        </dl>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Not set up yet. Add a base fare and a price per kilometre to use it.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={pending} onClick={() => setEditing(true)}>
          <PencilIcon aria-hidden /> Edit
        </Button>
        {on ? (
          <Button type="button" variant="ghost" disabled={pending} onClick={() => toggle(false)}>
            Turn off
          </Button>
        ) : (
          <Button type="button" disabled={pending || !configured} onClick={() => toggle(true)}>
            Enable
          </Button>
        )}
        {!on && !configured ? <p className="text-sm text-muted-foreground">Edit the prices first.</p> : null}
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-md">
          <EditForm view={view} onDone={() => setEditing(false)} />
        </DialogContent>
      </Dialog>
    </section>
  );
}
