// Plain module (no "use client") so server pages can read the list.
export const LISTING_TABS = ["overview", "pricing", "service", "vehicles", "policy"] as const;
export type ListingTab = (typeof LISTING_TABS)[number];

/** Old links and bookmarks used the tab names from before Hours and Coverage were merged. */
const LEGACY_TABS: Record<string, ListingTab> = {
  coverage: "service",
  availability: "service",
  photos: "vehicles",
};

/** The tab a `?tab=` value asks for; unknown values open Overview. */
export function resolveTab(requested: string | undefined): ListingTab {
  if (requested === undefined) return "overview";
  return LISTING_TABS.find((t) => t === requested) ?? LEGACY_TABS[requested] ?? "overview";
}
