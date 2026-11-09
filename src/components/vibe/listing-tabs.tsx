"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { VibeListingView } from "@/lib/vibe/types";

import { BasicsTab } from "./basics-tab";
import { LISTING_TABS, type ListingTab } from "./listing-tab-names";
import { LocationTab } from "./location-tab";
import { PhotosTab } from "./photos-tab";
import { PolicyTab } from "./policy-tab";
import { ScheduleTab } from "./schedule-tab";
import { TicketsTab } from "./tickets-tab";

const LABELS: Record<ListingTab, string> = {
  basics: "Basics",
  tickets: "Tickets",
  schedule: "Schedule",
  photos: "Photos",
  location: "Location",
  policy: "Cancellation",
};

export function ListingTabs({
  listing,
  initialTab,
}: {
  listing: VibeListingView;
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
      <TabsContent value="basics">
        <BasicsTab listing={listing} />
      </TabsContent>
      <TabsContent value="tickets">
        <TicketsTab listing={listing} />
      </TabsContent>
      <TabsContent value="schedule">
        <ScheduleTab listing={listing} />
      </TabsContent>
      <TabsContent value="photos">
        <PhotosTab listing={listing} />
      </TabsContent>
      <TabsContent value="location">
        <LocationTab listing={listing} />
      </TabsContent>
      <TabsContent value="policy">
        <PolicyTab listing={listing} />
      </TabsContent>
    </Tabs>
  );
}
