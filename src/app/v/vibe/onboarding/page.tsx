import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/skeleton";
import { VibeBusinessForm } from "@/components/vibe/business-form";
import { VibeDocuments } from "@/components/vibe/documents-panel";
import { EntityCards } from "@/components/vibe/entity-cards";
import { EntitySwitcher } from "@/components/vibe/entity-switcher";
import { StatusBanner } from "@/components/vendor/status-banner";
import { SubmitPanel } from "@/components/vendor/submit-panel";
import { VendorPage } from "@/components/vendor/vendor-page";
import { submitVibeProfileAction } from "@/lib/vibe/profile-actions";
import { NEW_ENTITY } from "@/lib/vibe/entity-view";
import { vibeProfileMissing, vibeProfileMode } from "@/lib/vibe/profile-status";
import { getVibeOverview } from "@/lib/vibe/queries";

export const metadata: Metadata = {
  title: "Set up your Vibe profile | YaadGuide",
};

type Props = { searchParams: Promise<{ entity?: string; new?: string }> };

async function Body({ searchParams }: Props): Promise<React.JSX.Element> {
  const { entity, new: adding } = await searchParams;
  const overview = await getVibeOverview(adding ? NEW_ENTITY : entity);
  if (!overview) redirect("/auth/sign-in?next=%2Fv%2Fvibe%2Fonboarding");

  const { entities, profile } = overview;
  if (!adding && !profile && entities.length > 0) {
    return <EntityCards entities={entities} base="/v/vibe/onboarding" heading="Choose a business to set up" />;
  }
  const mode = vibeProfileMode(profile?.status);
  const today = new Date().toISOString().slice(0, 10);
  const missing = vibeProfileMissing({
    hasProfile: profile !== null,
    hasGovernmentId: overview.hasGovernmentId,
    hasRegistration: overview.documents.some((d) => d.docType === "business_registration"),
  });

  return (
    <div className="flex flex-col gap-10">
      {adding ? (
        <p className="max-w-[65ch] rounded-xl bg-muted p-4 text-sm text-muted-foreground">
          This is a separate business with its own documents and its own review. Your government ID covers all your businesses.
        </p>
      ) : (
        <EntitySwitcher entities={entities} currentId={profile?.id ?? null} base="/v/vibe/onboarding" />
      )}
      {profile ? <StatusBanner status={profile.status} note={profile.reviewNote} /> : null}

      <section aria-labelledby="business-heading" className="flex flex-col gap-4">
        <h2 id="business-heading" className="text-xl font-semibold">
          Business details
        </h2>
        <VibeBusinessForm
          key={profile?.id ?? "new"}
          entityId={profile?.id}
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
            submit={submitVibeProfileAction.bind(null, profile?.id)}
            doneHref="/v/vibe"
          />
        </section>
      )}
    </div>
  );
}

export default function Page(props: Props): React.JSX.Element {
  return (
    <VendorPage
      title="Set up your Vibe profile"
      description="Tell travelers who you are, upload your documents, then send them to an admin. Each step saves as you go, so you can leave and come back."
      wide
    >
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" aria-busy="true" />}>
        <Body {...props} />
      </Suspense>
    </VendorPage>
  );
}
