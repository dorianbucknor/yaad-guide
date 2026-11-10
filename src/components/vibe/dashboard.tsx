import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { UpcomingSlot, VibeListingSummary } from "@/lib/vibe/types";

import { ListingList } from "./listing-list";

const slotFormat = new Intl.DateTimeFormat("en-JM", {
  timeZone: "America/Jamaica",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function statusLine(listings: VibeListingSummary[]): string {
  const count = (status: VibeListingSummary["status"]): number => listings.filter((l) => l.status === status).length;
  const parts = [
    [count("live"), "live"],
    [count("in_review"), "in review"],
    [count("draft"), "draft"],
  ] as const;
  return parts
    .filter(([n]) => n > 0)
    .map(([n, label]) => `${n} ${label}`)
    .join(", ");
}

/** What is coming up first, then the listings. Bookings are not open yet, so every slot shows 0 booked for now. */
export function VibeDashboard({
  upcoming,
  listings,
  showEntity = false,
}: {
  upcoming: UpcomingSlot[];
  listings: VibeListingSummary[];
  showEntity?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="coming-up-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="coming-up-heading" className="text-xl font-semibold">
            Coming up
          </h2>
          <Link href="/v/vibe/calendar" className={buttonVariants({ variant: "outline" })}>
            Open calendar
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="max-w-[65ch] text-muted-foreground">
            No open dates coming up. Add a weekly schedule or a slot on one of your listings, then send it for review.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
            {upcoming.map((slot) => (
              <li key={slot.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <span className="flex flex-col gap-1">
                  <span className="font-medium tabular-nums">{slotFormat.format(new Date(slot.startsAt))}</span>
                  <span className="text-sm text-muted-foreground">{slot.listingTitle}</span>
                </span>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {slot.booked} of {slot.capacity} booked
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="listings-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="listings-heading" className="text-xl font-semibold">
            Your listings
          </h2>
          {listings.length > 0 ? <p className="text-sm text-muted-foreground">{statusLine(listings)}</p> : null}
        </div>
        <ListingList listings={listings} showEntity={showEntity} />
      </section>
    </div>
  );
}
