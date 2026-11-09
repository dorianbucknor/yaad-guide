import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Checklist } from "@/components/vendor/checklist";
import { StatusBanner } from "@/components/vendor/status-banner";
import { TransferInbox } from "@/components/vendor/transfer-inbox";
import { MoveAttention } from "@/components/move/attention-banner";
import { VendorPage } from "@/components/vendor/vendor-page";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/skeleton";
import { checklistSteps, profileMode } from "@/lib/vendor/checklist";
import { getVendorOverview } from "@/lib/vendor/queries";

export const metadata: Metadata = {
  title: "Vendor profile | YaadGuide",
};

async function Business(): Promise<React.JSX.Element> {
  const overview = await getVendorOverview();
  if (!overview) redirect("/auth/sign-in?next=%2Fv%2Fmove%2Fprofile");
  const profile = overview.profile;

  return (
    <div className="flex flex-col gap-10">
      {profile ? (
        <StatusBanner status={profile.status} note={profile.reviewNote} />
      ) : (
        <p className="max-w-[65ch] text-muted-foreground">
          Start with your business details. Each step saves as you go, so you
          can leave and come back.
        </p>
      )}
      <section aria-labelledby="steps-heading" className="flex flex-col gap-4">
        <h2 id="steps-heading" className="text-xl font-semibold">
          Your setup
        </h2>
        <Checklist
          steps={checklistSteps(overview)}
          readOnly={profileMode(overview) === "locked"}
        />
      </section>
      <TransferInbox transfers={overview.transfers} />
      <div className="flex flex-wrap gap-2">
        <Link
          href="/profile"
          className={buttonVariants({ variant: "outline" })}
        >
          Your profile
        </Link>
      </div>
    </div>
  );
}

export default function Page(): React.JSX.Element {
  return (
    <VendorPage
      banner={
        <Suspense fallback={null}>
          <MoveAttention scope="profile" />
        </Suspense>
      }
      title="Vendor profile"
      description="Your business details, vehicles and documents."
      wide
    >
      <Suspense
        fallback={
          <Skeleton className="h-64 w-full rounded-2xl" aria-busy="true" />
        }
      >
        <Business />
      </Suspense>
    </VendorPage>
  );
}
