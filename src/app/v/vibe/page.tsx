import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/skeleton";
import { SetupPrompt } from "@/components/vendor/setup-prompt";
import { VibeDashboard } from "@/components/vibe/dashboard";
import { EntityCards } from "@/components/vibe/entity-cards";
import { VendorPage } from "@/components/vendor/vendor-page";
import { setupStatus } from "@/lib/vibe/entity-view";
import { getMyVibeListings, getUpcomingVibeSlots, getVibeOverview } from "@/lib/vibe/queries";

export const metadata: Metadata = {
  title: "Vibe | YaadGuide",
};

async function Body(): Promise<React.JSX.Element> {
  const overview = await getVibeOverview();
  if (!overview) redirect("/auth/sign-in?next=%2Fv%2Fvibe");
  const { entities } = overview;
  if (entities.some((e) => e.status === "approved")) {
    const [listings, upcoming] = await Promise.all([getMyVibeListings(), getUpcomingVibeSlots(8)]);
    return (
      <div className="flex flex-col gap-10">
        {entities.length > 1 ? <EntityCards entities={entities} base="/v/vibe/profile" /> : null}
        <VibeDashboard listings={listings} upcoming={upcoming} />
      </div>
    );
  }
  return (
    <SetupPrompt
      category="vibe"
      status={setupStatus(entities)}
      setupHref="/v/vibe/onboarding"
      profileHref="/v/vibe/profile"
    />
  );
}

export default function Page(): React.JSX.Element {
  return (
    <VendorPage title="Vibe" description="Your events and attractions." wide>
      <Suspense fallback={<Skeleton className="h-28 w-full max-w-2xl rounded-2xl" aria-busy="true" />}>
        <Body />
      </Suspense>
    </VendorPage>
  );
}
