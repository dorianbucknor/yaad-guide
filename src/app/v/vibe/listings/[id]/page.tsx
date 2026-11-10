import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/skeleton";
import { DINING_LISTING_TABS, type DiningListingTab } from "@/components/vibe/dining-listing-tab-names";
import { DiningListingTabs } from "@/components/vibe/dining-listing-tabs";
import { LISTING_TABS, type ListingTab } from "@/components/vibe/listing-tab-names";
import { ListingTabs } from "@/components/vibe/listing-tabs";
import { BackLink } from "@/components/vendor/back-link";
import { VendorPage } from "@/components/vendor/vendor-page";
import { getVibeListing } from "@/lib/vibe/queries";

export const metadata: Metadata = {
  title: "Edit Vibe listing | YaadGuide",
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

async function Editor({ params, searchParams }: Props): Promise<React.JSX.Element> {
  const [{ id }, { tab: requested }] = await Promise.all([params, searchParams]);
  const listing = await getVibeListing(id);
  if (!listing) {
    // Signed out and a listing that is not yours look the same from here; sign-in tells them apart.
    redirect(`/auth/sign-in?next=${encodeURIComponent(`/v/vibe/listings/${id}`)}`);
  }
  const description = "Finish each tab, then send the listing for review.";
  const back = <BackLink href="/v/vibe/listings">All listings</BackLink>;
  if (listing.subtype === "dining") {
    const diningTab: DiningListingTab = DINING_LISTING_TABS.find((t) => t === requested) ?? "basics";
    return (
      <VendorPage title={listing.title} description={description} banner={back} wide>
        <DiningListingTabs key={diningTab} listing={listing} initialTab={diningTab} />
      </VendorPage>
    );
  }
  const tab: ListingTab = LISTING_TABS.find((t) => t === requested) ?? "basics";
  // Remount when a checklist link changes the tab.
  return (
    <VendorPage title={listing.title} description={description} banner={back} wide>
      <ListingTabs key={tab} listing={listing} initialTab={tab} />
    </VendorPage>
  );
}

export default function Page(props: Props): React.JSX.Element {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-4xl rounded-2xl" aria-busy="true" />}>
      <Editor {...props} />
    </Suspense>
  );
}
