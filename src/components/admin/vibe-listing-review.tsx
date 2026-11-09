"use client";

import { useState } from "react";

import { useSave } from "@/components/move/use-save";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { resolveVibeFlagAction, reviewVibeListingAction } from "@/lib/vibe/admin-actions";
import type { OpenVibeFlag, ReviewVibeListing } from "@/lib/vibe/admin-queries";
import { formatPrice } from "@/lib/vibe/format";

const FLAG_LABEL: Record<string, string> = {
  price: "Prices changed",
  photo: "Photos changed",
};
const SUBTYPE_LABEL = { event: "Event", attraction: "Attraction", dining: "Dining" } as const;

function VibeListingCard({ listing }: { listing: ReviewVibeListing }): React.JSX.Element {
  const { pending, run } = useSave();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const decide = (decision: "approve" | "reject"): void => {
    if (decision === "reject" && note.trim() === "") {
      setError("Give a reason so the vendor knows what to fix.");
      return;
    }
    setError(null);
    run(() => reviewVibeListingAction({ listingId: listing.id, decision, note }), {
      success: decision === "approve" ? "Listing is live" : "Sent back to the vendor",
      onFail: (r) => setError(r.fieldErrors?.note ?? r.error),
    });
  };

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold">{listing.title}</h3>
          <Badge variant="outline">{SUBTYPE_LABEL[listing.subtype]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {listing.businessName} · {listing.ownerName} · {listing.region}
        </p>
      </div>
      <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium">Tickets</dt>
          <dd className="text-muted-foreground tabular-nums">
            {listing.tickets.length === 0
              ? "None"
              : listing.tickets
                  .map((t) => `${t.name} ${formatPrice(t.price, listing.currency)}${t.discountPercent ? ` (${t.discountPercent}% off)` : ""}`)
                  .join(", ")}
          </dd>
        </div>
        <div>
          <dt className="font-medium">Schedule</dt>
          <dd className="text-muted-foreground">{listing.weeklyTimes === 0 ? "Dates added by hand" : `${listing.weeklyTimes} weekly times`}</dd>
        </div>
        <div>
          <dt className="font-medium">Area</dt>
          <dd className="text-muted-foreground">{listing.area ?? "Not set"}</dd>
        </div>
        <div>
          <dt className="font-medium">Address</dt>
          <dd className="text-muted-foreground">{listing.address || "Not set"}</dd>
        </div>
        <div>
          <dt className="font-medium">Photos</dt>
          <dd className="text-muted-foreground tabular-nums">{listing.photoCount}</dd>
        </div>
      </dl>
      {listing.description ? <p className="max-w-[65ch] text-sm">{listing.description}</p> : null}
      <Field>
        <FieldLabel htmlFor={`vibe-note-${listing.id}`}>Note to the vendor (needed to send back)</FieldLabel>
        <Textarea id={`vibe-note-${listing.id}`} rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
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

function VibeFlagRow({ flag }: { flag: OpenVibeFlag }): React.JSX.Element {
  const { pending, run } = useSave();
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <span className="font-medium">{flag.title}</span>
        <span className="text-sm text-muted-foreground">{flag.businessName}</span>
        <Badge variant="outline" className="self-start">
          {FLAG_LABEL[flag.kind] ?? flag.kind}
        </Badge>
      </div>
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => resolveVibeFlagAction(flag.id), { success: "Flag resolved" })}>
        Mark checked
      </Button>
    </li>
  );
}

export function VibeListingReview({ listings, flags }: { listings: ReviewVibeListing[]; flags: OpenVibeFlag[] }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="vibe-queue-heading" className="flex flex-col gap-4">
        <h2 id="vibe-queue-heading" className="text-xl font-semibold">
          Vibe listings waiting for review
        </h2>
        {listings.length === 0 ? <p className="text-muted-foreground">Nothing is waiting.</p> : null}
        <ul className="flex flex-col gap-4">
          {listings.map((l) => (
            <VibeListingCard key={l.id} listing={l} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="vibe-flags-heading" className="flex flex-col gap-4">
        <h2 id="vibe-flags-heading" className="text-xl font-semibold">
          Changes to check on live Vibe listings
        </h2>
        {flags.length === 0 ? <p className="text-muted-foreground">No open flags.</p> : null}
        <ul className="flex flex-col gap-2">
          {flags.map((f) => (
            <VibeFlagRow key={f.id} flag={f} />
          ))}
        </ul>
      </section>
    </div>
  );
}
