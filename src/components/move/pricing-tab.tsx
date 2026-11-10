"use client";

import { Trash2Icon } from "lucide-react";
import { useState } from "react";

import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteFlatRateAction, saveFlatRateAction } from "@/lib/move/actions";
import type { MoveListingView, PlaceRow } from "@/lib/move/queries";

import { DistancePricingCard } from "./distance-pricing-card";
import { ItemSelect } from "./item-select";
import { NEED_LISTING_TEXT } from "./listing-payload";
import { useSave } from "./use-save";

const toNumber = (value: string): number => (value.trim() === "" ? 0 : Number(value));

export function PricingTab({ view, places }: { view: MoveListingView; places: PlaceRow[] }): React.JSX.Element {
  const { pending, run } = useSave();
  const [pair, setPair] = useState<{ a: string | null; b: string | null; price: string }>({ a: null, b: null, price: "" });
  const [rateErrors, setRateErrors] = useState<Record<string, string>>({});

  const listing = view.listing;
  if (!listing) return <p className="text-muted-foreground">{NEED_LISTING_TEXT}</p>;

  const covered = listing.islandWide ? places : places.filter((p) => view.placeIds.includes(p.id));
  const items = covered.map((p) => ({ value: p.id, label: p.name }));
  const nameOf = (id: string) => places.find((p) => p.id === id)?.name ?? "Unknown place";
  const symbol = listing.currency === "jmd" ? "J$" : "$";

  const addRate = () =>
    run(() => saveFlatRateAction({ placeAId: pair.a ?? "", placeBId: pair.b ?? "", price: toNumber(pair.price) }), {
      success: "Flat rate saved",
      onFail: (result) => setRateErrors(result.fieldErrors ?? {}),
      onDone: () => {
        setRateErrors({});
        setPair({ a: null, b: null, price: "" });
      },
    });

  return (
    <div className="flex flex-col gap-10">
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <DistancePricingCard view={view} />

        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 md:p-5" aria-labelledby="add-rate-heading">
          <div className="flex flex-col gap-1">
            <h2 id="add-rate-heading" className="text-lg font-semibold">
              Add a flat rate
            </h2>
            <p className="max-w-[65ch] text-sm text-muted-foreground">
              A flat rate works both ways and replaces the distance price for that pair.
            </p>
          </div>
          {items.length < 2 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Choose at least two places on the Service area tab to add a flat rate.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <ItemSelect id="rate-a" label="From" items={items} value={pair.a} onChange={(a) => setPair((p) => ({ ...p, a }))} error={rateErrors.placeAId} />
                <ItemSelect id="rate-b" label="To" items={items} value={pair.b} onChange={(b) => setPair((p) => ({ ...p, b }))} error={rateErrors.placeBId} />
              </div>
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
            </>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-4" aria-labelledby="flat-heading">
        <h2 id="flat-heading" className="text-lg font-semibold">
          Flat rates between places
        </h2>
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
      </section>
    </div>
  );
}
