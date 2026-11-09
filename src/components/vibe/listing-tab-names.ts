// Plain module (no "use client") so server pages can read the list.
export const LISTING_TABS = ["basics", "tickets"] as const;
export type ListingTab = (typeof LISTING_TABS)[number];
