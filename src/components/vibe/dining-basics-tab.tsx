"use client";

import { useSave } from "@/components/move/use-save";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { submitListingAction } from "@/lib/vibe/actions";
import { diningReadiness } from "@/lib/vibe/dining";
import type { VibeListingView } from "@/lib/vibe/types";

import { BasicsForm } from "./basics-tab";
import { ReadinessCard, type ReadinessStep } from "./readiness-card";

const STATUS_LABEL = { draft: "Draft", in_review: "In review", live: "Live" } as const;

/** The checklist for a dining listing: the shared steps, plus the ones its booking mode needs. */
function stepsFor(listing: VibeListingView): ReadinessStep[] {
  const profile = listing.diningProfile;
  const steps: ReadinessStep[] = [
    { item: "profile_approved", label: "Vendor profile approved", tab: null },
    { item: "basics", label: "Description and area", tab: "basics" },
    { item: "venue_type", label: "Venue type and how travelers book", tab: "details" },
  ];
  if (profile?.venueType === "restaurant") {
    steps.push({ item: "service_mode", label: "Dine-in, takeout or both", tab: "details" });
  }
  if (profile?.bookingMode === "prepaid") {
    steps.push({ item: "tickets", label: "At least one ticket", tab: "tickets" });
  }
  if (profile?.bookingMode === "prepaid" || (profile?.bookingMode === "reservation" && profile.reservationStyle === "slotted")) {
    steps.push({ item: "slots", label: "A date or a weekly schedule", tab: "schedule" });
  }
  if (profile?.bookingMode === "reservation" && profile.reservationStyle === "hours_only") {
    steps.push({ item: "hours", label: "Opening hours for at least one day", tab: "hours" });
  }
  steps.push(
    { item: "cover_photo", label: "A cover photo", tab: "photos" },
    { item: "address", label: "Street address, town and parish", tab: "location" },
    { item: "pin", label: "A pin on the map", tab: "location" },
  );
  return steps;
}

/** The Basics tab of a dining listing: status, what is left to do, the form, and sending it for review. */
export function DiningBasicsTab({ listing }: { listing: VibeListingView }): React.JSX.Element {
  const { pending, run } = useSave();
  const p = listing.diningProfile;
  const readiness = diningReadiness({
    profileApproved: listing.profileApproved,
    description: listing.description,
    area: listing.area,
    addressLine1: listing.addressLine1,
    town: listing.town,
    parish: listing.parish,
    latitude: listing.latitude,
    longitude: listing.longitude,
    hasCoverPhoto: listing.photos.some((photo) => photo.isCover),
    profile: p
      ? {
          venueType: p.venueType,
          dineIn: p.dineIn,
          takeout: p.takeout,
          bookingMode: p.bookingMode,
          reservationStyle: p.reservationStyle,
          ticketCount: listing.tickets.length,
          futureOpenSlotCount: listing.futureOpenSlotCount,
          ruleCount: listing.rules.length,
          autoGenerate: listing.autoGenerateSlots,
          businessHoursCount: listing.businessHours.length,
        }
      : null,
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={listing.status === "live" ? "default" : "outline"}>{STATUS_LABEL[listing.status]}</Badge>
        {listing.paused ? <Badge variant="outline">Paused</Badge> : null}
      </div>
      {listing.reviewNote ? (
        <p className="max-w-[65ch] rounded-xl bg-warning-subtle p-4 text-sm text-warning-subtle-foreground">
          Review note: {listing.reviewNote}
        </p>
      ) : null}
      {p?.bookingMode === "listing_only" ? (
        <p className="max-w-[65ch] rounded-xl bg-muted p-4 text-sm text-muted-foreground">
          Travelers can add this listing to their itinerary and pay you in person. YaadGuide does not take payment or a commission for it.
        </p>
      ) : null}

      {listing.status === "draft" ? (
        <>
          <ReadinessCard listingId={listing.id} missing={readiness.missing} steps={stepsFor(listing)} />
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              className="self-start"
              disabled={pending || !readiness.ready}
              onClick={() => run(() => submitListingAction(listing.id), { success: "Sent for review" })}
            >
              Send for review
            </Button>
            {!readiness.ready ? <p className="text-sm text-muted-foreground">Finish the list above to send it.</p> : null}
          </div>
        </>
      ) : null}

      <BasicsForm listing={listing} />
    </div>
  );
}
