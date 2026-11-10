import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/skeleton";
import { SetupPrompt } from "@/components/vendor/setup-prompt";
import { buttonVariants } from "@/components/ui/button";
import { VibeDocuments } from "@/components/vibe/documents-panel";
import { EntityCards } from "@/components/vibe/entity-cards";
import { EntitySwitcher } from "@/components/vibe/entity-switcher";
import { StatusBanner } from "@/components/vendor/status-banner";
import { VendorPage } from "@/components/vendor/vendor-page";
import { entityHref } from "@/lib/vibe/entity-view";
import { vibeProfileMode } from "@/lib/vibe/profile-status";
import { getVibeOverview } from "@/lib/vibe/queries";

export const metadata: Metadata = {
  title: "Vendor profile | YaadGuide",
};

type Props = { searchParams: Promise<{ entity?: string }> };

async function Body({ searchParams }: Props): Promise<React.JSX.Element> {
  const { entity } = await searchParams;
  const overview = await getVibeOverview(entity);
  if (!overview) redirect("/auth/sign-in?next=%2Fv%2Fvibe%2Fprofile");

  const { entities, profile } = overview;
  if (entities.length === 0) {
    return <SetupPrompt category="vibe" status={undefined} setupHref="/v/vibe/onboarding" />;
  }
  if (!profile) return <EntityCards entities={entities} base="/v/vibe/profile" heading="Choose a business" />;

  const mode = vibeProfileMode(profile.status);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-10">
      <EntitySwitcher entities={entities} currentId={profile.id} base="/v/vibe/profile" />
      <StatusBanner status={profile.status} note={profile.reviewNote} />

      <section aria-labelledby="details-heading" className="flex flex-col gap-4">
        <h2 id="details-heading" className="text-xl font-semibold">
          Business details
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted-foreground">Business name</dt>
            <dd className="font-medium">{profile.businessName ?? "Unnamed business"}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted-foreground">Primary region</dt>
            <dd className="font-medium">{profile.primaryRegion}</dd>
          </div>
        </dl>
        {mode === "edit" ? (
          <div>
            <Link
              href={entityHref("/v/vibe/onboarding", entities.length, profile.id)}
              className={buttonVariants({ variant: "outline" })}
            >
              Edit your setup
            </Link>
          </div>
        ) : null}
        <div>
          <Link href="/v/vibe/onboarding?new=1" className={buttonVariants({ variant: "ghost" })}>
            Add another business
          </Link>
        </div>
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

export default function Page(props: Props): React.JSX.Element {
  return (
    <VendorPage title="Vendor profile" description="Your Vibe business details and documents." wide>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" aria-busy="true" />}>
        <Body {...props} />
      </Suspense>
    </VendorPage>
  );
}
