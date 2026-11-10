"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MoveListingView, PlaceRow } from "@/lib/move/queries";

import { LISTING_TABS, type ListingTab } from "./listing-tab-names";
import { OverviewTab } from "./overview-tab";
import { PolicyTab } from "./policy-tab";
import { PricingTab } from "./pricing-tab";
import { ServiceTab } from "./service-tab";
import { VehiclesTab } from "./vehicles-tab";

const LABELS: Record<ListingTab, string> = {
  overview: "Overview",
  pricing: "Pricing",
  service: "Service area",
  vehicles: "Vehicles",
  policy: "Cancellation",
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
      <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden">
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
      <TabsContent value="service">
        <ServiceTab view={view} places={places} />
      </TabsContent>
      <TabsContent value="vehicles">
        <VehiclesTab view={view} />
      </TabsContent>
      <TabsContent value="policy">
        <PolicyTab view={view} />
      </TabsContent>
    </Tabs>
  );
}
