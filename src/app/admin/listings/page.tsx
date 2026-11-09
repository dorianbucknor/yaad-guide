import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ListingReview } from "@/components/admin/listing-review";
import { VibeListingReview } from "@/components/admin/vibe-listing-review";
import { VendorPage } from "@/components/vendor/vendor-page";
import { Skeleton } from "@/components/skeleton";
import { getListingQueue } from "@/lib/move/admin-queries";
import { getVibeListingQueue } from "@/lib/vibe/admin-queries";

export const metadata: Metadata = {
  title: "Listing review | YaadGuide",
};

async function Queue(): Promise<React.JSX.Element> {
  const [data, vibe] = await Promise.all([getListingQueue(), getVibeListingQueue()]);
  if (!data || !vibe) redirect("/auth/forbidden");
  return (
    <div className="flex flex-col gap-16">
      <ListingReview listings={data.listings} flags={data.flags} />
      <VibeListingReview listings={vibe.listings} flags={vibe.flags} />
    </div>
  );
}

export default function Page(): React.JSX.Element {
  return (
    <VendorPage title="Listing review" description="Approve a vendor's first listing and check later changes." backHref="/admin/vendors" backLabel="Vendor review" wide>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" aria-busy="true" />}>
        <Queue />
      </Suspense>
    </VendorPage>
  );
}
