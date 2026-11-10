import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/skeleton";
import { SetupPrompt } from "@/components/vendor/setup-prompt";
import { ListingList } from "@/components/vibe/listing-list";
import { VendorPage } from "@/components/vendor/vendor-page";
import { getMyVibeListings, getVibeOverview } from "@/lib/vibe/queries";

export const metadata: Metadata = {
  title: "Your Vibe listings | YaadGuide",
};

async function Body(): Promise<React.JSX.Element> {
  const overview = await getVibeOverview();
  if (!overview) redirect("/auth/sign-in?next=%2Fv%2Fvibe%2Flistings");
  if (overview.entities.length === 0) {
    return (
      <SetupPrompt
        category="vibe"
        status={undefined}
        setupHref="/v/vibe/onboarding"
        lead="You need a vendor profile before you can add listings."
      />
    );
  }
  const listings = await getMyVibeListings();
  return <ListingList listings={listings} showEntity={overview.entities.length > 1} />;
}

export default function Page(): React.JSX.Element {
  return (
    <VendorPage title="Vibe listings" description="Your events and attractions. Each one is reviewed by an admin before travelers see it." wide>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" aria-busy="true" />}>
        <Body />
      </Suspense>
    </VendorPage>
  );
}
