import type { Metadata } from "next";

import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/skeleton";
import { SetupPrompt } from "@/components/vendor/setup-prompt";
import { BasicsForm } from "@/components/vibe/basics-tab";
import { VendorPage } from "@/components/vendor/vendor-page";
import { getVibeOverview } from "@/lib/vibe/queries";

export const metadata: Metadata = {
  title: "New Vibe listing | YaadGuide",
};

async function Body(): Promise<React.JSX.Element> {
  const overview = await getVibeOverview();
  if (!overview) redirect("/auth/sign-in?next=%2Fv%2Fvibe%2Flistings%2Fnew");
  if (overview.entities.length === 0) {
    return (
      <SetupPrompt
        category="vibe"
        status={undefined}
        setupHref="/v/vibe/onboarding"
        lead="You need a vendor profile before you can add listings."
      />
    );
  }
  // A listing can be drafted under a business that is still waiting for approval, but not a rejected one.
  const entities = overview.entities.filter((e) => e.status !== "rejected");
  return <BasicsForm entities={entities} />;
}

export default function Page(): React.JSX.Element {
  return (
    <VendorPage title="New listing" description="Start with the basics. You add tickets, times, photos and the location next.">
      <Suspense fallback={<Skeleton className="h-96 w-full max-w-2xl rounded-2xl" aria-busy="true" />}>
        <Body />
      </Suspense>
    </VendorPage>
  );
}
