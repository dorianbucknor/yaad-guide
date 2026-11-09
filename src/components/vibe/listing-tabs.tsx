"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { VibeListingView } from "@/lib/vibe/types";

import { BasicsTab } from "./basics-tab";
import { LISTING_TABS, type ListingTab } from "./listing-tab-names";
import { TicketsTab } from "./tickets-tab";

const LABELS: Record<ListingTab, string> = {
  basics: "Basics",
  tickets: "Tickets",
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
    </Tabs>
  );
}
