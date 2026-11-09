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
import { monthRange } from "@/lib/vibe/calendar";
import { getMyVibeListings, getVibeBlockedDays, getVibeOverview, getVibeSlots } from "@/lib/vibe/queries";

export const metadata: Metadata = {
  title: "Vibe calendar | YaadGuide",
};

async function Body({ searchParams }: { searchParams: Promise<{ listing?: string; month?: string }> }): Promise<React.JSX.Element> {
  const overview = await getVibeOverview();
  if (!overview) redirect("/auth/sign-in?next=%2Fv%2Fvibe%2Fcalendar");

  const listings = overview.profile ? await getMyVibeListings() : [];
  if (listings.length === 0) {
    return overview.profile ? (
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
  const [slots, blockedDays] = await Promise.all([getVibeSlots(listing.id, from, to), getVibeBlockedDays(listing.id, from, to)]);

  return (
    <SlotCalendar
      key={`${listing.id}-${month}`}
      listingId={listing.id}
      listings={listings.map((l) => ({ id: l.id, title: l.title }))}
      month={month}
      today={today}
      slots={slots}
      blockedDays={blockedDays}
    />
  );
}

export default function Page({ searchParams }: { searchParams: Promise<{ listing?: string; month?: string }> }): React.JSX.Element {
  return (
    <VendorPage title="Vibe calendar" description="See what is booked, change capacity, add a slot, or close a day." wide>
      <Suspense fallback={<Skeleton className="h-[32rem] w-full rounded-2xl" aria-busy="true" />}>
        <Body searchParams={searchParams} />
      </Suspense>
    </VendorPage>
  );
}
