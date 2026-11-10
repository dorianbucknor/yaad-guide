import type { MoveListingView } from "@/lib/move/queries";
import type { ListingInput } from "@/lib/schemas/move";

/** The full listing the save action expects, with some fields changed. */
export function listingPayload(view: MoveListingView, changes: Partial<ListingInput> = {}): ListingInput {
  const l = view.listing;
  return {
    currency: l?.currency ?? "usd",
    islandWide: l?.islandWide ?? false,
    distancePricingEnabled: l?.distancePricingEnabled ?? true,
    baseFare: l?.baseFare ?? null,
    perKm: l?.perKm ?? null,
    hourlyRate: l?.hourlyRate ?? null,
    description: l?.description ?? null,
    cancellationPolicy: l?.cancellationPolicy ?? "flexible",
    ...changes,
  };
}

export const NEED_LISTING_TEXT = "Save your listing details on the Overview tab first.";
