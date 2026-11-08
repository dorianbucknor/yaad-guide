import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ListingReview } from "@/components/admin/listing-review";
import { VendorPage } from "@/components/vendor/vendor-page";
import { Skeleton } from "@/components/ui/skeleton";
import { getListingQueue } from "@/lib/move/admin-queries";

export const metadata: Metadata = {
  title: "Listing review | YaadGuide",
};

async function Queue(): Promise<React.JSX.Element> {
  const data = await getListingQueue();
  if (!data) redirect("/auth/forbidden");
  return <ListingReview listings={data.listings} flags={data.flags} />;
}

export default function Page(): React.JSX.Element {
  return (
    <VendorPage title="Listing review" description="Approve a vendor's first MOVE listing and check later changes." backHref="/admin/vendors" backLabel="Vendor review" wide>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" aria-busy="true" />}>
        <Queue />
      </Suspense>
    </VendorPage>
  );
}
