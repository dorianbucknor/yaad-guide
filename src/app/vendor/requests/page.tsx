import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PillNav } from "@/components/move/dashboard/pill-nav";
import { RequestsTable } from "@/components/move/dashboard/requests-table";
import { VendorPage } from "@/components/vendor/vendor-page";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboard } from "@/lib/move/dashboard-queries";
import { getMyListing } from "@/lib/move/queries";

export const metadata: Metadata = {
  title: "Requests | YaadGuide",
};

async function Requests(): Promise<React.JSX.Element> {
  const [view, data] = await Promise.all([getMyListing(), getDashboard()]);
  if (!view) redirect("/vendor");
  return <RequestsTable requests={data.requests} activePlaceId={null} />;
}

export default function Page(): React.JSX.Element {
  return (
    <VendorPage title="Requests" description="Answer before the deadline so travelers can plan." wide>
      <PillNav current="requests" />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-3xl" aria-busy="true" />}>
        <Requests />
      </Suspense>
    </VendorPage>
  );
}
