import type { PlaceRow } from "@/lib/move/queries";

/** The pseudo-place at the top of the list. Choosing it sets the listing's island-wide flag. */
export const ALL_ISLAND = "all-island";

export type CoverageDraft = {
  allIsland: boolean;
  /** Specific places. Kept while All Island is chosen, so removing All Island brings them back. */
  placeIds: string[];
};

export type CoverageRow = { id: string; name: string; parish: string };

/** Choose a place, or All Island. With All Island chosen a specific place is not needed, so it is ignored. */
export function pickPlace(draft: CoverageDraft, id: string): CoverageDraft {
  if (id === ALL_ISLAND) return { ...draft, allIsland: true };
  if (draft.allIsland || draft.placeIds.includes(id)) return draft;
  return { ...draft, placeIds: [...draft.placeIds, id] };
}

export function removePlace(draft: CoverageDraft, id: string): CoverageDraft {
  if (id === ALL_ISLAND) return { ...draft, allIsland: false };
  return { ...draft, placeIds: draft.placeIds.filter((placeId) => placeId !== id) };
}

/** The rows the table shows: just All Island when it is chosen, otherwise the chosen places by name. */
export function coverageRows(draft: CoverageDraft, places: readonly PlaceRow[]): CoverageRow[] {
  if (draft.allIsland) return [{ id: ALL_ISLAND, name: "All Island", parish: "Every parish" }];
  const chosen = new Set(draft.placeIds);
  return places
    .filter((place) => chosen.has(place.id))
    .map(({ id, name, parish }) => ({ id, name, parish }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function sameCoverage(a: CoverageDraft, b: CoverageDraft): boolean {
  if (a.allIsland !== b.allIsland) return false;
  if (a.placeIds.length !== b.placeIds.length) return false;
  const have = new Set(a.placeIds);
  return b.placeIds.every((id) => have.has(id));
}
