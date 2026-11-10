"use client";

import Link from "next/link";
import { useState } from "react";

import { ItemSelect } from "@/components/move/item-select";
import { Badge } from "@/components/ui/badge";
import { SORT_OPTIONS, SUBTYPE_LABEL, sortListings, type ListingSort } from "@/lib/vibe/listing-sort";
import type { VibeListingSummary } from "@/lib/vibe/types";

const STATUS_LABEL = { draft: "Draft", in_review: "In review", live: "Live" } as const;

const nextSlotFormat = new Intl.DateTimeFormat("en-JM", {
  timeZone: "America/Jamaica",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

/** The listing rows with a sort control. Live listings stay at the top whichever order is chosen. */
export function SortedListings({
  listings,
  showEntity = false,
}: {
  listings: VibeListingSummary[];
  /** Name each listing's business, for a vendor who has several. */
  showEntity?: boolean;
}): React.JSX.Element {
  const [sort, setSort] = useState<ListingSort>("newest");
  return (
    <div className="flex flex-col gap-4">
      {listings.length > 1 ? (
        <div className="w-full max-w-56">
          <ItemSelect id="listing-sort" label="Sort by" items={SORT_OPTIONS} value={sort} onChange={(value) => setSort(value as ListingSort)} />
        </div>
      ) : null}
      <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
        {sortListings(listings, sort).map((listing) => (
          <li key={listing.id}>
            <Link
              href={`/v/vibe/listings/${listing.id}`}
              className="flex min-h-11 flex-wrap items-center justify-between gap-3 p-4 underline-offset-4 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-medium">{listing.title}</span>
                {showEntity && listing.entityName ? (
                  <span className="text-sm text-muted-foreground">{listing.entityName}</span>
                ) : null}
                <span className="text-sm text-muted-foreground tabular-nums">
                  {listing.nextSlotAt ? `Next: ${nextSlotFormat.format(new Date(listing.nextSlotAt))}` : "No open dates yet"}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{SUBTYPE_LABEL[listing.subtype]}</Badge>
                <Badge variant={listing.status === "live" ? "default" : "outline"}>{STATUS_LABEL[listing.status]}</Badge>
                {listing.paused ? <Badge variant="outline">Paused</Badge> : null}
                {listing.openFlags > 0 ? <Badge variant="outline">An admin is checking a change</Badge> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
