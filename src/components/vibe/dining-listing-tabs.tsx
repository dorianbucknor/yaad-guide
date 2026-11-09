"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { VibeListingView } from "@/lib/vibe/types";

import { DiningBasicsTab } from "./dining-basics-tab";
import { DiningDetailsTab } from "./dining-details-tab";
import { diningTabsFor, type DiningListingTab } from "./dining-listing-tab-names";
import { HoursTab } from "./hours-tab";
import { LocationTab } from "./location-tab";
import { PhotosTab } from "./photos-tab";
import { PolicyTab } from "./policy-tab";
import { ScheduleTab } from "./schedule-tab";
import { TicketsTab } from "./tickets-tab";

const LABELS: Record<DiningListingTab, string> = {
  basics: "Basics",
  details: "Details",
  tickets: "Tickets",
  schedule: "Schedule",
  hours: "Hours",
  location: "Location",
  photos: "Photos",
  policy: "Cancellation",
};

/** The dining editor. Which tabs appear depends on the booking mode chosen on the Details tab. */
export function DiningListingTabs({
  listing,
  initialTab,
}: {
  listing: VibeListingView;
  initialTab: DiningListingTab;
}): React.JSX.Element {
  const tabs = diningTabsFor(listing.diningProfile);
  const [tab, setTab] = useState<DiningListingTab>(initialTab);
  // A save on the Details tab can change the list; fall back to Basics if the open tab is gone.
  const current = tabs.includes(tab) ? tab : "basics";
  return (
    <Tabs value={current} onValueChange={(next) => setTab(next as DiningListingTab)} className="gap-6">
      <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden">
        {tabs.map((t) => (
          <TabsTrigger key={t} value={t}>
            {LABELS[t]}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="basics">
        <DiningBasicsTab listing={listing} />
      </TabsContent>
      <TabsContent value="details">
        <DiningDetailsTab listing={listing} />
      </TabsContent>
      {tabs.includes("tickets") ? (
        <TabsContent value="tickets">
          <TicketsTab listing={listing} />
        </TabsContent>
      ) : null}
      {tabs.includes("schedule") ? (
        <TabsContent value="schedule">
          <ScheduleTab listing={listing} />
        </TabsContent>
      ) : null}
      {tabs.includes("hours") ? (
        <TabsContent value="hours">
          <HoursTab listing={listing} />
        </TabsContent>
      ) : null}
      <TabsContent value="location">
        <LocationTab listing={listing} />
      </TabsContent>
      <TabsContent value="photos">
        <PhotosTab listing={listing} />
      </TabsContent>
      {tabs.includes("policy") ? (
        <TabsContent value="policy">
          <PolicyTab listing={listing} />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
