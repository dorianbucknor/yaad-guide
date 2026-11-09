import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { VibeListingSummary } from "@/lib/vibe/types";

const STATUS_LABEL = { draft: "Draft", in_review: "In review", live: "Live" } as const;
const SUBTYPE_LABEL = { event: "Event", attraction: "Attraction" } as const;

const nextSlotFormat = new Intl.DateTimeFormat("en-JM", {
  timeZone: "America/Jamaica",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

/** The vendor's listings, one row each, with the next open slot. */
export function ListingList({ listings }: { listings: VibeListingSummary[] }): React.JSX.Element {
  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="max-w-[65ch] text-muted-foreground">
          You have no listings yet. Add an event or an attraction, set its tickets and times, then send it for review.
        </p>
        <Link href="/v/vibe/listings/new" className={buttonVariants()}>
          New listing
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/v/vibe/listings/new" className={buttonVariants()}>
          New listing
        </Link>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
        {listings.map((listing) => (
          <li key={listing.id}>
            <Link
              href={`/v/vibe/listings/${listing.id}`}
              className="flex min-h-11 flex-wrap items-center justify-between gap-3 p-4 underline-offset-4 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-medium">{listing.title}</span>
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
