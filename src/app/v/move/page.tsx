import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { serverNow } from "@/lib/server-time";

import { HomeBoard } from "@/components/move/board/home-board";
import { StatusBanner } from "@/components/vendor/status-banner";
import { MoveAttention } from "@/components/move/attention-banner";
import { VendorPage } from "@/components/vendor/vendor-page";
import { buttonVariants } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/skeleton";
import { getDashboard } from "@/lib/move/dashboard-queries";
import { getMyListing, getPlaces } from "@/lib/move/queries";
import { getVendorOverview } from "@/lib/vendor/queries";

export const metadata: Metadata = {
  title: "Move dashboard | YaadGuide",
};

async function MoveHome(): Promise<React.JSX.Element> {
  const [data, view, places] = await Promise.all([
    getDashboard(),
    getMyListing(),
    getPlaces(),
  ]);
  const listing = view?.listing ?? null;
  const served = listing?.islandWide
    ? places
    : places.filter((p) => view?.placeIds.includes(p.id));
  return (
    <HomeBoard
      data={data}
      places={served}
      nowMs={serverNow()}
      stepsLeft={view?.readiness.missing.length ?? 0}
      listingLive={listing?.status === "live"}
      listingPaused={listing?.paused ?? false}
    />
  );
}

function SetupPrompt({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: string;
}): React.JSX.Element {
  return (
    <Item variant="outline" className="bg-brand-light/40 dark:bg-primary/15">
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        <ItemDescription className="line-clamp-none">{body}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Link href="/v/move/profile" className={buttonVariants()}>
          {cta}
        </Link>
      </ItemActions>
    </Item>
  );
}

async function VendorHub(): Promise<React.JSX.Element> {
  const overview = await getVendorOverview();
  if (!overview) redirect("/auth/sign-in?next=%2Fv");

  const profile = overview.profile;
  if (profile?.status === "approved") {
    return (
      <div className="flex flex-col gap-6">
        {profile.businessName ? null : (
          <SetupPrompt
            title="Add your business details"
            body="Travelers see your business name next to your listing. It takes a minute."
            cta="Add details"
          />
        )}
        <MoveHome />
      </div>
    );
  }

  const underReview = profile?.status === "pending";
  return (
    <div className="flex flex-col gap-6">
      {profile ? (
        <StatusBanner status={profile.status} note={profile.reviewNote} />
      ) : null}
      {underReview ? null : (
        <SetupPrompt
          title={
            profile
              ? "Finish setting up your business"
              : "Set up your business details"
          }
          body="Add your business details, vehicles and documents, then send them for review. Requests, your calendar and your listing open once an admin approves you."
          cta={profile ? "Continue setup" : "Set up business"}
        />
      )}
    </div>
  );
}

export default function Page(): React.JSX.Element {
  return (
    <VendorPage
      banner={
        <Suspense fallback={null}>
          <MoveAttention scope="dashboard" />
        </Suspense>
      }
      title="Dashboard"
      description="Answer requests before they expire and keep your listing ready."
      full
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
