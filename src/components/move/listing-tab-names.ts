// Plain module (no "use client") so server pages can read the list.
export const LISTING_TABS = ["overview", "pricing", "coverage", "availability", "photos", "policy"] as const;
export type ListingTab = (typeof LISTING_TABS)[number];
