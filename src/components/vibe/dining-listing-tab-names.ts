import type { DiningProfile } from "@/lib/vibe/types";

// Plain module (no "use client") so server pages can read the list.
/** Every tab a dining listing can show, in display order. */
export const DINING_LISTING_TABS = ["basics", "details", "tickets", "schedule", "hours", "location", "photos", "policy"] as const;
export type DiningListingTab = (typeof DINING_LISTING_TABS)[number];

/**
 * The tabs a dining listing shows. Which ones depend on how travelers will book: the choice is made
 * once on the Details tab, so before it is saved only the always-needed tabs appear.
 */
export function diningTabsFor(profile: DiningProfile | null): DiningListingTab[] {
  const wanted = new Set<DiningListingTab>(["basics", "details", "location", "photos"]);
  if (profile?.bookingMode === "prepaid") {
    wanted.add("tickets");
    wanted.add("schedule");
    wanted.add("policy");
  } else if (profile?.bookingMode === "reservation") {
    if (profile.reservationStyle === "slotted") {
      wanted.add("schedule");
      wanted.add("policy");
    } else {
      wanted.add("hours");
    }
  }
  return DINING_LISTING_TABS.filter((tab) => wanted.has(tab));
}
