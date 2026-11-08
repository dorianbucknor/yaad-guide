"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MoveListingView, PlaceRow } from "@/lib/move/queries";

import { AvailabilityTab } from "./availability-tab";
import { CoverageTab } from "./coverage-tab";
import { OverviewTab } from "./overview-tab";
import { PhotosTab } from "./photos-tab";
import { PricingTab } from "./pricing-tab";

export const LISTING_TABS = ["overview", "pricing", "coverage", "availability", "photos"] as const;
export type ListingTab = (typeof LISTING_TABS)[number];

const LABELS: Record<ListingTab, string> = {
  overview: "Overview",
  pricing: "Pricing",
  coverage: "Coverage",
  availability: "Hours",
  photos: "Photos",
};

export function ListingTabs({
  view,
  places,
  initialTab,
}: {
  view: MoveListingView;
  places: PlaceRow[];
  initialTab: ListingTab;
}): React.JSX.Element {
  const [tab, setTab] = useState<ListingTab>(initialTab);
  return (
    <Tabs value={tab} onValueChange={(next) => setTab(next as ListingTab)} className="gap-6">
      <TabsList className="w-full justify-start overflow-x-auto">
        {LISTING_TABS.map((t) => (
          <TabsTrigger key={t} value={t}>
            {LABELS[t]}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="overview">
        <OverviewTab view={view} />
      </TabsContent>
      <TabsContent value="pricing">
        <PricingTab view={view} places={places} />
      </TabsContent>
      <TabsContent value="coverage">
        <CoverageTab view={view} places={places} />
      </TabsContent>
      <TabsContent value="availability">
        <AvailabilityTab view={view} />
      </TabsContent>
      <TabsContent value="photos">
        <PhotosTab view={view} />
      </TabsContent>
    </Tabs>
  );
}
