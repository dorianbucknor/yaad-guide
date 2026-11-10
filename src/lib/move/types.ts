export type Currency = "usd" | "jmd";

export type CoverageListing = {
  islandWide: boolean;
  placeIds: readonly string[];
};

export type FlatRate = { placeAId: string; placeBId: string; price: number };

export type PricingListing = CoverageListing & {
  currency: Currency;
  baseFare: number | null;
  perKm: number | null;
  hourlyRate: number | null;
  /** When false the distance formula is ignored; flat rates and hourly hire still apply. */
  distancePricingEnabled: boolean;
  flatRates: readonly FlatRate[];
};

/** Distance between two places, or null when the pair is unknown. */
export type RouteLookup = (aId: string, bId: string) => { km: number; minutes: number } | null;

export type Quote =
  | { source: "flat" | "formula"; amount: number; currency: Currency }
  | { source: "none" };

export type VehicleCapacity = { seats: number; large: number; carryOn: number };
export type Party = { size: number; large: number; carryOn: number };

export type Leg = { fromId: string; toId: string };
