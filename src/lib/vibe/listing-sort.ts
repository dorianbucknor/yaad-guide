import type { VibeListingSummary } from "./types";

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "category", label: "Category" },
] as const;
export type ListingSort = (typeof SORT_OPTIONS)[number]["value"];

export const SUBTYPE_LABEL = { event: "Event", attraction: "Attraction", dining: "Dining" } as const;

const newer = (a: VibeListingSummary, b: VibeListingSummary): number => b.createdAt.localeCompare(a.createdAt);

/** Live listings always come first; within each group the chosen order applies. */
export function sortListings(listings: readonly VibeListingSummary[], sort: ListingSort): VibeListingSummary[] {
  const within = (a: VibeListingSummary, b: VibeListingSummary): number => {
    if (sort === "oldest") return -newer(a, b);
    if (sort === "category") return SUBTYPE_LABEL[a.subtype].localeCompare(SUBTYPE_LABEL[b.subtype]) || newer(a, b);
    return newer(a, b);
  };
  return [...listings].sort((a, b) => Number(b.status === "live") - Number(a.status === "live") || within(a, b));
}
