import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  LISTING_TABS,
  type ListingTab,
} from "@/components/move/listing-tab-names";
import { ListingTabs } from "@/components/move/listing-tabs";
import { RegistrationGate } from "@/components/vendor/registration-gate";
import { MoveAttention } from "@/components/move/attention-banner";
import { VendorPage } from "@/components/vendor/vendor-page";
import { Skeleton } from "@/components/skeleton";
import { getMyListing, getPlaces } from "@/lib/move/queries";

export const metadata: Metadata = {
  title: "Your MOVE listing | YaadGuide",
};

async function Editor({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}): Promise<React.JSX.Element> {
  const { tab: requested } = await searchParams;
  const tab: ListingTab =
    LISTING_TABS.find((t) => t === requested) ?? "overview";
  const [view, places] = await Promise.all([getMyListing(), getPlaces()]);
  if (!view) redirect("/v");
  // Remount when a checklist link changes the tab.
  return <ListingTabs key={tab} view={view} places={places} initialTab={tab} />;
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}): React.JSX.Element {
  return (
    <VendorPage
      banner={
        <Suspense fallback={null}>
          <MoveAttention scope="listing" />
        </Suspense>
      }
      title="Move listings"
      description="Set your prices, the places you serve and your hours. Send it for review when the list is complete."
      wide
    >
      <Suspense
        fallback={
          <Skeleton className="h-96 w-full rounded-2xl" aria-busy="true" />
        }
      >
        <RegistrationGate skeleton="listing" feature="your listing">
          <Editor searchParams={searchParams} />
        </RegistrationGate>
      </Suspense>
    </VendorPage>
  );
}
