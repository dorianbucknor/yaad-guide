import type { Metadata } from "next";
import { Suspense } from "react";

import { VendorReviewDetail } from "@/components/admin/vendor-review-detail";
import { VendorPage } from "@/components/vendor/vendor-page";
import { Skeleton } from "@/components/skeleton";

export const metadata: Metadata = {
  title: "Review a vendor | YaadGuide",
};

async function Detail({ params }: { params: Promise<{ id: string }> }): Promise<React.JSX.Element> {
  const { id } = await params;
  return <VendorReviewDetail id={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }): React.JSX.Element {
  return (
    <VendorPage title="Review a vendor" wide>
      <Suspense
        fallback={
          <div className="flex flex-col gap-4" aria-busy="true">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        }
      >
        <Detail params={params} />
      </Suspense>
    </VendorPage>
  );
}
