import type { CoverageListing, Leg } from "./types";

/** A trip is bookable when pickup and drop-off are both places the vendor serves. */
export function covers(listing: CoverageListing, fromId: string, toId: string): boolean {
  if (!fromId || !toId) return false;
  if (listing.islandWide) return true;
  return listing.placeIds.includes(fromId) && listing.placeIds.includes(toId);
}

/** Every leg of a multi-stop itinerary must be covered. */
export function coversItinerary(listing: CoverageListing, legs: readonly Leg[]): boolean {
  return legs.length > 0 && legs.every((leg) => covers(listing, leg.fromId, leg.toId));
}
