import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { SHELL_ICONS } from "@/components/shell/shell-icons";
import { SetupPrompt, VendorPrompt } from "@/components/vendor/setup-prompt";
import { SlotCalendar } from "@/components/vibe/slot-calendar";
import { VendorPage } from "@/components/vendor/vendor-page";
import { localDayOf } from "@/lib/move/time";
import { addDays, monthRange } from "@/lib/vibe/calendar";
import { withEntity } from "@/lib/vibe/entity-view";
import { getMyVibeListings, getVibeBlockedDays, getVibeOverview, getVibeSlots } from "@/lib/vibe/queries";

export const metadata: Metadata = {
  title: "Vibe calendar | YaadGuide",
};

async function Body({ searchParams }: { searchParams: Promise<{ listing?: string; month?: string }> }): Promise<React.JSX.Element> {
  const overview = await getVibeOverview();
  if (!overview) redirect("/auth/sign-in?next=%2Fv%2Fvibe%2Fcalendar");

  const hasBusiness = overview.entities.length > 0;
  const listings = hasBusiness ? await getMyVibeListings() : [];
  if (listings.length === 0) {
    return hasBusiness ? (
      <VendorPrompt
        icon={SHELL_ICONS.vibe}
        title="No listings yet"
        description="Add a listing to see its dates here."
        action={
          <Link href="/v/vibe/listings/new" className={buttonVariants()}>
            New listing
          </Link>
        }
      />
    ) : (
      <SetupPrompt
        category="vibe"
        status={undefined}
        setupHref="/v/vibe/onboarding"
        lead="You need a vendor profile before you can see dates."
      />
    );
  }

  const { listing: listingParam, month: monthParam } = await searchParams;
  const listing = listings.find((l) => l.id === listingParam) ?? listings[0];
  // Reading the clock needs a request first; the queries above wait for one.
  const today = localDayOf(new Date());
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam ?? "") ? (monthParam as string) : today.slice(0, 7);
  const { from, to } = monthRange(month);
  // Closed days run from the earlier of this month's start and today to a year ahead, so the list shows what is coming.
  const [slots, weekSlots, blockedDays] = await Promise.all([
    getVibeSlots(listing.id, from, to),
    getVibeSlots(listing.id, today, addDays(today, 7)),
    getVibeBlockedDays(listing.id, from < today ? from : today, addDays(today, 366)),
  ]);
  const weekBooked = weekSlots.reduce((sum, slot) => sum + slot.booked, 0);

  return (
    <SlotCalendar
      key={`${listing.id}-${month}`}
      listingId={listing.id}
      listings={listings.map((l) => ({ id: l.id, title: withEntity(l.title, l.entityName, overview.entities.length > 1) }))}
      month={month}
      today={today}
      slots={slots}
      blockedDays={blockedDays}
      weekBooked={weekBooked}
      usesSlots={listing.usesSlots}
    />
  );
}

export default function Page({ searchParams }: { searchParams: Promise<{ listing?: string; month?: string }> }): React.JSX.Element {
  return (
    <VendorPage title="Vibe calendar" description="See what is booked, block dates, and change or add slots." full>
      <Suspense fallback={<Skeleton className="h-[32rem] w-full rounded-2xl" aria-busy="true" />}>
        <Body searchParams={searchParams} />
      </Suspense>
    </VendorPage>
  );
}
