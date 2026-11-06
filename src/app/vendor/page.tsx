import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Checklist } from "@/components/vendor/checklist";
import { StatusBanner } from "@/components/vendor/status-banner";
import { TransferInbox } from "@/components/vendor/transfer-inbox";
import { VendorPage } from "@/components/vendor/vendor-page";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { checklistSteps, profileMode } from "@/lib/vendor/checklist";
import { getVendorOverview } from "@/lib/vendor/queries";

export const metadata: Metadata = {
  title: "Vendor home | YaadGuide",
};

async function VendorHub(): Promise<React.JSX.Element> {
  const overview = await getVendorOverview();
  if (!overview) redirect("/auth/sign-in?next=%2Fvendor");

  const profile = overview.profile;
  const mode = profileMode(overview);
  const steps = checklistSteps(overview);

  return (
    <div className="flex flex-col gap-10">
      {profile ? (
        <StatusBanner status={profile.status} note={profile.reviewNote} />
      ) : (
        <p className="max-w-[65ch] text-muted-foreground">
          Start with your business details. Each step saves as you go, so you can leave and come back.
        </p>
      )}
      <section aria-labelledby="steps-heading" className="flex flex-col gap-4">
        <h2 id="steps-heading" className="text-xl font-semibold">
          Your setup
        </h2>
        <Checklist steps={steps} readOnly={mode === "locked"} />
      </section>
      <TransferInbox transfers={overview.transfers} />
      <div className="flex flex-wrap gap-2">
        <Link href="/profile" className={buttonVariants({ variant: "outline" })}>
          Your profile
        </Link>
      </div>
    </div>
  );
}

export default function Page(): React.JSX.Element {
  return (
    <VendorPage
      title="Vendor home"
      description="Set up your driver profile, add your vehicles and documents, and send it for review."
      backHref="/"
      backLabel="Home"
    >
      <Suspense
        fallback={
          <div className="flex flex-col gap-6" aria-busy="true">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        }
      >
        <VendorHub />
      </Suspense>
    </VendorPage>
  );
}
