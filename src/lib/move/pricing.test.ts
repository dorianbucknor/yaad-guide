import { describe, expect, it } from "vitest";

import { quoteHire, quoteTrip } from "./pricing";
import type { PricingListing, RouteLookup } from "./types";

const base: PricingListing = {
  currency: "usd",
  islandWide: false,
  placeIds: ["mbj", "negril", "kingston"],
  baseFare: 10,
  perKm: 1.5,
  hourlyRate: 25,
  flatRates: [{ placeAId: "mbj", placeBId: "negril", price: 80 }],
};

const routes: RouteLookup = (a, b) => {
  const key = [a, b].sort().join("|");
  const table: Record<string, { km: number; minutes: number }> = {
    "kingston|mbj": { km: 200.5, minutes: 270 },
    "kingston|negril": { km: 240, minutes: 320 },
    "mbj|negril": { km: 80, minutes: 110 },
  };
  return table[key] ?? null;
};

describe("quoteTrip", () => {
  it("uses the flat rate in both directions and ahead of the formula", () => {
    expect(quoteTrip(base, "mbj", "negril", routes)).toEqual({ source: "flat", amount: 80, currency: "usd" });
    expect(quoteTrip(base, "negril", "mbj", routes)).toEqual({ source: "flat", amount: 80, currency: "usd" });
  });

  it("prices other covered pairs as base fare plus per-km, rounded to cents", () => {
    expect(quoteTrip(base, "mbj", "kingston", routes)).toEqual({
      source: "formula",
      amount: 310.75,
      currency: "usd",
    });
  });

  it("returns none when there is no flat rate and no formula", () => {
    const noFormula = { ...base, baseFare: null, perKm: null };
    expect(quoteTrip(noFormula, "mbj", "kingston", routes)).toEqual({ source: "none" });
  });

  it("returns none when the route distance is unknown", () => {
    const wide = { ...base, islandWide: true };
    expect(quoteTrip(wide, "mbj", "somewhere-new", routes)).toEqual({ source: "none" });
  });

  it("returns none for a place the vendor does not cover", () => {
    expect(quoteTrip(base, "mbj", "ocho-rios", routes)).toEqual({ source: "none" });
  });

  it("returns none when pickup and drop-off are the same place", () => {
    expect(quoteTrip(base, "mbj", "mbj", routes)).toEqual({ source: "none" });
  });

  it("keeps the listing currency", () => {
    const jmd = { ...base, currency: "jmd" as const };
    expect(quoteTrip(jmd, "mbj", "negril", routes)).toMatchObject({ currency: "jmd" });
  });
});

describe("quoteHire", () => {
  it("is the hourly rate times the hours", () => {
    expect(quoteHire(base, 4)).toEqual({ source: "formula", amount: 100, currency: "usd" });
  });

  it("returns none without an hourly rate or with no hours", () => {
    expect(quoteHire({ ...base, hourlyRate: null }, 4)).toEqual({ source: "none" });
    expect(quoteHire(base, 0)).toEqual({ source: "none" });
  });
});
