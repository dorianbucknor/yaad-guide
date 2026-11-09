import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { VibeDocuments } from "@/components/vibe/documents-panel";
import { StatusBanner } from "@/components/vendor/status-banner";
import { VendorPage } from "@/components/vendor/vendor-page";
import { vibeProfileMode } from "@/lib/vibe/profile-status";
import { getVibeOverview } from "@/lib/vibe/queries";

export const metadata: Metadata = {
  title: "Vendor profile | YaadGuide",
};

async function Body(): Promise<React.JSX.Element> {
  const overview = await getVibeOverview();
  if (!overview) redirect("/auth/sign-in?next=%2Fv%2Fvibe%2Fprofile");

  const profile = overview.profile;
  if (!profile) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="max-w-[65ch] text-muted-foreground">
          You have not set up a Vibe profile yet. It takes your business details and two documents.
        </p>
        <Link href="/v/vibe/onboarding" className={buttonVariants()}>
          Start setup
        </Link>
      </div>
    );
  }

  const mode = vibeProfileMode(profile.status);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-10">
      <StatusBanner status={profile.status} note={profile.reviewNote} />

      <section aria-labelledby="details-heading" className="flex flex-col gap-4">
        <h2 id="details-heading" className="text-xl font-semibold">
          Business details
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted-foreground">Business name</dt>
            <dd className="font-medium">{profile.businessName ?? "Your own name"}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted-foreground">Primary region</dt>
            <dd className="font-medium">{profile.primaryRegion}</dd>
          </div>
        </dl>
        {mode === "edit" ? (
          <div>
            <Link href="/v/vibe/onboarding" className={buttonVariants({ variant: "outline" })}>
              Edit your setup
            </Link>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="documents-heading" className="flex flex-col gap-4">
        <h2 id="documents-heading" className="text-xl font-semibold">
          Documents
        </h2>
        <VibeDocuments overview={overview} mode={mode} today={today} />
      </section>
    </div>
  );
}

export default function Page(): React.JSX.Element {
  return (
    <VendorPage title="Vendor profile" description="Your Vibe business details and documents." wide>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" aria-busy="true" />}>
        <Body />
      </Suspense>
    </VendorPage>
  );
}
