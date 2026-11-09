import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { serverNow } from "@/lib/server-time";

import { RegistrationGate } from "@/components/vendor/registration-gate";
import { RequestBoard } from "@/components/move/board/request-board";
import { MoveAttention } from "@/components/move/attention-banner";
import { VendorPage } from "@/components/vendor/vendor-page";
import { Skeleton } from "@/components/skeleton";
import { getDashboard } from "@/lib/move/dashboard-queries";
import { getMyListing } from "@/lib/move/queries";

export const metadata: Metadata = {
  title: "Requests | YaadGuide",
};

async function Requests(): Promise<React.JSX.Element> {
  const [view, data] = await Promise.all([getMyListing(), getDashboard()]);
  if (!view) redirect("/v");
  return <RequestBoard requests={data.requests} nowMs={serverNow()} />;
}

export default function Page(): React.JSX.Element {
  return (
    <VendorPage
      banner={
        <Suspense fallback={null}>
          <MoveAttention scope="dashboard" />
        </Suspense>
      }
      title="Requests"
      description="Answer before the deadline so travelers can plan."
      full
    >
      <Suspense
        fallback={
          <Skeleton className="h-96 w-full rounded-2xl" aria-busy="true" />
        }
      >
        <RegistrationGate skeleton="board" feature="your requests">
          <Requests />
        </RegistrationGate>
      </Suspense>
    </VendorPage>
  );
}
