import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  BlockedCalendar,
  type CalendarTrip,
} from "@/components/move/blocked-calendar";
import { RegistrationGate } from "@/components/vendor/registration-gate";
import { MoveAttention } from "@/components/move/attention-banner";
import { VendorPage } from "@/components/vendor/vendor-page";
import { Skeleton } from "@/components/skeleton";
import { getDashboard } from "@/lib/move/dashboard-queries";
import { formatMoney } from "@/lib/move/format";
import { localDayOf } from "@/lib/move/time";
import { getMyListing } from "@/lib/move/queries";

export const metadata: Metadata = {
  title: "Calendar | YaadGuide",
};

async function CalendarView(): Promise<React.JSX.Element> {
  const [view, dashboard] = await Promise.all([getMyListing(), getDashboard()]);
  if (!view?.listing) redirect("/v/move/listing");

  const trips: CalendarTrip[] = dashboard.requests
    .filter((r) => r.status === "accepted" || r.status === "pending")
    .map((r) => ({
      id: r.id,
      day: localDayOf(new Date(r.pickupAt)),
      status: r.status as "accepted" | "pending",
      pickupAt: r.pickupAt,
      from: r.pickupName,
      to: r.dropoffName,
      party: r.partySize,
      who: r.travelerFirstName || "Traveler",
      quote:
        r.amount !== null && r.currency
          ? formatMoney(r.amount, r.currency)
          : "Quote on request",
    }));

  return <BlockedCalendar blocks={view.blocks} trips={trips} />;
}

export default function Page(): React.JSX.Element {
  return (
    <VendorPage
      banner={
        <Suspense fallback={null}>
          <MoveAttention scope="calendar" />
        </Suspense>
      }
      title="Calendar"
      description="Block days you can't drive. Booked trips and requests waiting for you are marked."
      full
    >
      <Suspense
        fallback={
          <Skeleton className="h-[40rem] w-full rounded-2xl" aria-busy="true" />
        }
      >
        <RegistrationGate skeleton="calendar" feature="your calendar">
          <CalendarView />
        </RegistrationGate>
      </Suspense>
    </VendorPage>
  );
}
