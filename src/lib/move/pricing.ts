import { covers } from "./coverage";
import type { PricingListing, Quote, RouteLookup } from "./types";

const NONE: Quote = { source: "none" };
const cents = (value: number): number => Math.round(value * 100) / 100;

/** Flat rate first, then base fare plus per-km. `none` means a custom quote. */
export function quoteTrip(
  listing: PricingListing,
  fromId: string,
  toId: string,
  routes: RouteLookup,
): Quote {
  if (fromId === toId || !covers(listing, fromId, toId)) return NONE;

  const flat = listing.flatRates.find(
    (rate) =>
      (rate.placeAId === fromId && rate.placeBId === toId) ||
      (rate.placeAId === toId && rate.placeBId === fromId),
  );
  if (flat) return { source: "flat", amount: cents(flat.price), currency: listing.currency };

  if (listing.baseFare === null || listing.perKm === null) return NONE;
  const route = routes(fromId, toId);
  if (!route) return NONE;
  return {
    source: "formula",
    amount: cents(listing.baseFare + route.km * listing.perKm),
    currency: listing.currency,
  };
}

/** Day hire: hourly rate times hours. */
export function quoteHire(listing: PricingListing, hours: number): Quote {
  if (listing.hourlyRate === null || hours <= 0) return NONE;
  return { source: "formula", amount: cents(listing.hourlyRate * hours), currency: listing.currency };
}
