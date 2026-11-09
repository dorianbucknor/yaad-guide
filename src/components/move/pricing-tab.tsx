"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { applyFailure } from "@/components/auth/apply-failure";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteFlatRateAction, saveFlatRateAction, saveListingAction } from "@/lib/move/actions";
import type { MoveListingView, PlaceRow } from "@/lib/move/queries";
import { listingSchema } from "@/lib/schemas/move";

import { ItemSelect } from "./item-select";
import { listingPayload, NEED_LISTING_TEXT } from "./listing-payload";
import { useSave } from "./use-save";

const formulaSchema = listingSchema.pick({ currency: true, baseFare: true, perKm: true, hourlyRate: true });
// react-hook-form also runs the default values (numbers or null) through this.
const toNumber = (value: unknown): number | null =>
  typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : null;
const CURRENCY_ITEMS = [
  { value: "usd", label: "US dollars (USD)" },
  { value: "jmd", label: "Jamaican dollars (JMD)" },
];

export function PricingTab({ view, places }: { view: MoveListingView; places: PlaceRow[] }): React.JSX.Element {
  const { pending, run } = useSave();
  const listing = view.listing;
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formulaSchema),
    defaultValues: {
      currency: listing?.currency ?? "usd",
      baseFare: listing?.baseFare ?? null,
      perKm: listing?.perKm ?? null,
      hourlyRate: listing?.hourlyRate ?? null,
    },
  });

  const [pair, setPair] = useState<{ a: string | null; b: string | null; price: string }>({ a: null, b: null, price: "" });
  const [rateErrors, setRateErrors] = useState<Record<string, string>>({});

  if (!listing) return <p className="text-muted-foreground">{NEED_LISTING_TEXT}</p>;

  const covered = view.listing?.islandWide ? places : places.filter((p) => view.placeIds.includes(p.id));
  const items = covered.map((p) => ({ value: p.id, label: p.name }));
  const nameOf = (id: string) => places.find((p) => p.id === id)?.name ?? "Unknown place";
  const symbol = listing.currency === "jmd" ? "J$" : "$";

  const saveFormula = handleSubmit((values) =>
    run(() => saveListingAction(listingPayload(view, values)), { onFail: (result) => applyFailure(result, setError) }),
  );

  const addRate = () =>
    run(
      () => saveFlatRateAction({ placeAId: pair.a ?? "", placeBId: pair.b ?? "", price: toNumber(pair.price) ?? 0 }),
      {
        success: "Flat rate saved",
        onFail: (result) => setRateErrors(result.fieldErrors ?? {}),
        onDone: () => {
          setRateErrors({});
          setPair({ a: null, b: null, price: "" });
        },
      },
    );

  return (
    <div className="flex flex-col gap-10">
      <form onSubmit={saveFormula} noValidate className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Price by distance</h2>
        <p className="max-w-[65ch] text-sm text-muted-foreground">
          Used for any trip without a flat rate. Travelers see the estimate before they ask.
        </p>
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
        <Button type="submit" className="self-start" disabled={pending}>
          {pending ? "Saving…" : "Save prices"}
        </Button>
      </form>

      <section className="flex flex-col gap-4" aria-labelledby="flat-heading">
        <h2 id="flat-heading" className="text-lg font-semibold">
          Flat rates between places
        </h2>
        <p className="max-w-[65ch] text-sm text-muted-foreground">
          A flat rate works both ways and replaces the distance price for that pair.
        </p>
        {view.flatRates.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Between</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Remove</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.flatRates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell>
                    {nameOf(rate.placeAId)} and {nameOf(rate.placeBId)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {symbol}
                    {rate.price.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={pending}
                      aria-label={`Remove flat rate between ${nameOf(rate.placeAId)} and ${nameOf(rate.placeBId)}`}
                      onClick={() => run(() => deleteFlatRateAction(rate.id), { success: "Flat rate removed" })}
                    >
                      <Trash2Icon aria-hidden />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No flat rates yet.</p>
        )}

        {items.length < 2 ? (
          <p className="text-sm text-muted-foreground">Choose at least two places on the Coverage tab to add a flat rate.</p>
        ) : (
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 md:p-5">
            <h3 className="text-base font-medium">Add a flat rate</h3>
            <ItemSelect id="rate-a" label="From" items={items} value={pair.a} onChange={(a) => setPair((p) => ({ ...p, a }))} error={rateErrors.placeAId} />
            <ItemSelect id="rate-b" label="To" items={items} value={pair.b} onChange={(b) => setPair((p) => ({ ...p, b }))} error={rateErrors.placeBId} />
            <TextField
              id="rate-price"
              label={`Price (${listing.currency.toUpperCase()})`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={pair.price}
              onChange={(e) => setPair((p) => ({ ...p, price: e.target.value }))}
              error={rateErrors.price}
            />
            {rateErrors.form ? <FieldError>{rateErrors.form}</FieldError> : null}
            <Button type="button" className="self-start" disabled={pending} onClick={addRate}>
              Add flat rate
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
