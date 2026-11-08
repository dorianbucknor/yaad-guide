import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BlockedCalendar, type CalendarTrip } from "@/components/move/blocked-calendar";
import { PillNav } from "@/components/move/dashboard/pill-nav";
import { VendorPage } from "@/components/vendor/vendor-page";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboard } from "@/lib/move/dashboard-queries";
import { localDayOf } from "@/lib/move/time";
import { getMyListing } from "@/lib/move/queries";

export const metadata: Metadata = {
  title: "Calendar | YaadGuide",
};

async function CalendarView(): Promise<React.JSX.Element> {
  const [view, dashboard] = await Promise.all([getMyListing(), getDashboard()]);
  if (!view?.listing) redirect("/vendor/listing");

  const trips: CalendarTrip[] = dashboard.requests
    .filter((r) => r.status === "accepted" || r.status === "pending")
    .map((r) => ({ day: localDayOf(new Date(r.pickupAt)), status: r.status as "accepted" | "pending" }));

  return <BlockedCalendar blocks={view.blocks} trips={trips} />;
}

export default function Page(): React.JSX.Element {
  return (
    <VendorPage
      title="Calendar"
      description="Block days you can't drive. Accepted trips and requests waiting for you are marked."
    >
      <PillNav current="calendar" />
      <Suspense fallback={<Skeleton className="h-96 w-full max-w-sm rounded-2xl" aria-busy="true" />}>
        <CalendarView />
      </Suspense>
    </VendorPage>
  );
}
