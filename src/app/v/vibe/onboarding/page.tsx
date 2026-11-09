import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/skeleton";
import { VibeBusinessForm } from "@/components/vibe/business-form";
import { VibeDocuments } from "@/components/vibe/documents-panel";
import { StatusBanner } from "@/components/vendor/status-banner";
import { SubmitPanel } from "@/components/vendor/submit-panel";
import { VendorPage } from "@/components/vendor/vendor-page";
import { submitVibeProfileAction } from "@/lib/vibe/profile-actions";
import { vibeProfileMissing, vibeProfileMode } from "@/lib/vibe/profile-status";
import { getVibeOverview } from "@/lib/vibe/queries";

export const metadata: Metadata = {
  title: "Set up your Vibe profile | YaadGuide",
};

async function Body(): Promise<React.JSX.Element> {
  const overview = await getVibeOverview();
  if (!overview) redirect("/auth/sign-in?next=%2Fv%2Fvibe%2Fonboarding");

  const profile = overview.profile;
  const mode = vibeProfileMode(profile?.status);
  const today = new Date().toISOString().slice(0, 10);
  const missing = vibeProfileMissing({
    hasProfile: profile !== null,
    hasGovernmentId: overview.hasGovernmentId,
    hasRegistration: overview.documents.some((d) => d.docType === "business_registration"),
  });

  return (
    <div className="flex flex-col gap-10">
      {profile ? <StatusBanner status={profile.status} note={profile.reviewNote} /> : null}

      <section aria-labelledby="business-heading" className="flex flex-col gap-4">
        <h2 id="business-heading" className="text-xl font-semibold">
          Business details
        </h2>
        <VibeBusinessForm
          businessName={profile?.businessName ?? ""}
          primaryRegion={profile?.primaryRegion ?? ""}
          readOnly={mode !== "edit"}
        />
      </section>

      <section aria-labelledby="documents-heading" className="flex flex-col gap-4">
        <h2 id="documents-heading" className="text-xl font-semibold">
          Documents
        </h2>
        <VibeDocuments overview={overview} mode={mode} today={today} />
      </section>

      {mode === "add" ? null : (
        <section aria-labelledby="submit-heading" className="flex flex-col gap-4">
          <h2 id="submit-heading" className="text-xl font-semibold">
            Submit for review
          </h2>
          <SubmitPanel
            ready={missing.length === 0}
            missing={missing}
            locked={mode === "locked"}
            submit={submitVibeProfileAction}
            doneHref="/v/vibe"
          />
        </section>
      )}
    </div>
  );
}

export default function Page(): React.JSX.Element {
  return (
    <VendorPage
      title="Set up your Vibe profile"
      description="Tell travelers who you are, upload your documents, then send them to an admin. Each step saves as you go, so you can leave and come back."
      wide
    >
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" aria-busy="true" />}>
        <Body />
      </Suspense>
    </VendorPage>
  );
}
