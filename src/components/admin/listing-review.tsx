"use client";

import { useState } from "react";

import { useSave } from "@/components/move/use-save";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { resolveFlagAction, reviewListingAction } from "@/lib/move/admin-actions";
import type { OpenFlag, ReviewListing } from "@/lib/move/admin-queries";

const FLAG_LABEL: Record<string, string> = {
  price: "Prices changed",
  photo: "Vehicle photo changed",
  profile_photo: "Profile photo changed",
};

export function ListingCard({ listing }: { listing: ReviewListing }): React.JSX.Element {
  const { pending, run } = useSave();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const decide = (decision: "approve" | "reject") => {
    if (decision === "reject" && note.trim() === "") {
      setError("Give a reason so the vendor knows what to fix.");
      return;
    }
    setError(null);
    run(() => reviewListingAction({ listingId: listing.id, decision, note }), {
      success: decision === "approve" ? "Listing is live" : "Sent back to the vendor",
      onFail: (r) => setError(r.fieldErrors?.note ?? r.error),
    });
  };

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <div>
        <h3 className="text-lg font-semibold">{listing.businessName}</h3>
        <p className="text-sm text-muted-foreground">
          {listing.ownerName} · {listing.region}
        </p>
      </div>
      <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium">Coverage</dt>
          <dd className="text-muted-foreground">{listing.islandWide ? "Whole island" : `${listing.placeCount} places`}</dd>
        </div>
        <div>
          <dt className="font-medium">Pricing</dt>
          <dd className="text-muted-foreground tabular-nums">
            {listing.flatRateCount} flat rates
            {listing.baseFare !== null && listing.perKm !== null
              ? ` · ${listing.currency.toUpperCase()} ${listing.baseFare} + ${listing.perKm}/km`
              : ""}
          </dd>
        </div>
      </dl>
      {listing.description ? <p className="max-w-[65ch] text-sm">{listing.description}</p> : null}
      <Field>
        <FieldLabel htmlFor={`note-${listing.id}`}>Note to the vendor (needed to send back)</FieldLabel>
        <Textarea id={`note-${listing.id}`} rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pending} onClick={() => decide("approve")}>
          Approve and go live
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => decide("reject")}>
          Send back
        </Button>
      </div>
    </li>
  );
}

/** One change on a live listing, with the button that clears it. */
export function FlagRow({ flag }: { flag: OpenFlag }): React.JSX.Element {
  const { pending, run } = useSave();
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <span className="font-medium">{flag.businessName}</span>
        <Badge variant="outline" className="self-start">
          {FLAG_LABEL[flag.kind] ?? flag.kind}
        </Badge>
      </div>
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => resolveFlagAction(flag.id), { success: "Flag resolved" })}>
        Mark checked
      </Button>
    </li>
  );
}

export function ListingReview({ listings, flags }: { listings: ReviewListing[]; flags: OpenFlag[] }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="queue-heading" className="flex flex-col gap-4">
        <h2 id="queue-heading" className="text-xl font-semibold">
          First listings waiting for review
        </h2>
        {listings.length === 0 ? <p className="text-muted-foreground">Nothing is waiting.</p> : null}
        <ul className="flex flex-col gap-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="flags-heading" className="flex flex-col gap-4">
        <h2 id="flags-heading" className="text-xl font-semibold">
          Changes to check on live listings
        </h2>
        {flags.length === 0 ? <p className="text-muted-foreground">No open flags.</p> : null}
        <ul className="flex flex-col gap-2">
          {flags.map((f) => (
            <FlagRow key={f.id} flag={f} />
          ))}
        </ul>
      </section>
    </div>
  );
}
