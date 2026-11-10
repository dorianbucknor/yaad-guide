"use client";

import { GlobeIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { saveAvailabilityAction, saveListingAction, setCoverageAction, suggestPlaceAction } from "@/lib/move/actions";
import type { MoveListingView, PlaceRow } from "@/lib/move/queries";

import { ALL_ISLAND, coverageRows, pickPlace, removePlace, sameCoverage, type CoverageDraft } from "./coverage-draft";
import { HoursEditor, type HoursWindow } from "./hours-editor";
import { listingPayload, NEED_LISTING_TEXT } from "./listing-payload";
import { PlaceCombobox } from "./place-combobox";
import { useSave } from "./use-save";

const sameWindows = (a: readonly HoursWindow[], b: readonly HoursWindow[]): boolean =>
  a.length === b.length && a.every((w, i) => w.weekday === b[i].weekday && w.startMinutes === b[i].startMinutes && w.endMinutes === b[i].endMinutes);

const keyOf = (w: HoursWindow): number => w.weekday * 10_000 + w.startMinutes;
const sorted = (all: readonly HoursWindow[]): HoursWindow[] => [...all].sort((a, b) => keyOf(a) - keyOf(b));

/** Where you work and when: the places you serve, the weekly hours, and one Save for both. */
export function ServiceTab({ view, places }: { view: MoveListingView; places: PlaceRow[] }): React.JSX.Element {
  const { pending, run } = useSave();
  const saved: CoverageDraft = { allIsland: view.listing?.islandWide ?? false, placeIds: view.placeIds };
  const savedWindows: HoursWindow[] = view.windows.map(({ weekday, startMinutes, endMinutes }) => ({ weekday, startMinutes, endMinutes }));

  const [coverage, setCoverage] = useState<CoverageDraft>(saved);
  const [windows, setWindows] = useState<HoursWindow[]>(savedWindows);
  const [error, setError] = useState<string | undefined>();

  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [suggestError, setSuggestError] = useState<string | undefined>();

  if (!view.listing) return <p className="text-muted-foreground">{NEED_LISTING_TEXT}</p>;

  const rows = coverageRows(coverage, places);
  const dirty = !sameCoverage(coverage, saved) || !sameWindows(sorted(windows), sorted(savedWindows));

  const save = (): void =>
    run(
      async () => {
        // The island-wide flag lives on the listing; it follows whether All Island is in the table.
        const listing = await saveListingAction(listingPayload(view, { islandWide: coverage.allIsland }));
        if (!listing.ok) return listing;
        // With All Island chosen the specific places are kept as they are, so removing it brings them back.
        if (!coverage.allIsland) {
          const placesResult = await setCoverageAction({ placeIds: coverage.placeIds });
          if (!placesResult.ok) return placesResult;
        }
        return saveAvailabilityAction({ windows });
      },
      { success: "Service area saved", onFail: (result) => setError(result.error), onDone: () => setError(undefined) },
    );

  return (
    <div className="flex flex-col gap-10">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 md:p-5" aria-labelledby="places-heading">
          <div className="flex flex-col gap-1">
            <h2 id="places-heading" className="text-lg font-semibold">
              Places you serve
            </h2>
            <p className="max-w-[65ch] text-sm text-muted-foreground">
              Search the list and add each pickup or drop-off area you cover. Choose All Island to cover everywhere.
            </p>
          </div>
          <PlaceCombobox
            id="place-search"
            places={places}
            chosen={new Set(coverage.placeIds)}
            allIslandChosen={coverage.allIsland}
            disabled={pending}
            onPick={(id) => setCoverage((draft) => pickPlace(draft, id))}
          />
          {rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Place</TableHead>
                  <TableHead>Parish</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Remove</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        {row.id === ALL_ISLAND ? <GlobeIcon aria-hidden className="size-4 text-primary" /> : null}
                        {row.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.parish}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={pending}
                        aria-label={`Remove ${row.name}`}
                        onClick={() => setCoverage((draft) => removePlace(draft, row.id))}
                      >
                        <XIcon aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No places yet. Search above to add the first one.
            </p>
          )}
          {coverage.allIsland && coverage.placeIds.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              Your {coverage.placeIds.length} chosen {coverage.placeIds.length === 1 ? "place is" : "places are"} kept. Remove All Island to see{" "}
              {coverage.placeIds.length === 1 ? "it" : "them"} again.
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 md:p-5" aria-labelledby="suggest-heading">
          <div className="flex flex-col gap-1">
            <h2 id="suggest-heading" className="text-lg font-semibold">
              Missing a place?
            </h2>
            <p className="text-sm text-muted-foreground">Suggest it and an admin will review it.</p>
          </div>
          <TextField id="suggest-name" label="Place name" value={name} onChange={(e) => setName(e.target.value)} error={suggestError} />
          <TextField id="suggest-note" label="Note (optional)" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
          <Button
            type="button"
            variant="outline"
            className="self-start"
            disabled={pending}
            onClick={() =>
              run(() => suggestPlaceAction({ name, note: note || undefined }), {
                success: "Thanks, we will take a look",
                onFail: (result) => setSuggestError(result.fieldErrors?.name),
                onDone: () => {
                  setName("");
                  setNote("");
                  setSuggestError(undefined);
                },
              })
            }
          >
            Suggest this place
          </Button>
        </section>
      </div>

      <section className="flex flex-col gap-4" aria-labelledby="hours-heading">
        <div className="flex flex-col gap-1">
          <h2 id="hours-heading" className="text-lg font-semibold">
            Operating hours
          </h2>
          <p className="max-w-[65ch] text-sm text-muted-foreground">
            Hours you take trips each week, in Jamaica time. Block specific dates on the Calendar page.
          </p>
        </div>
        <HoursEditor windows={windows} onChange={setWindows} />
      </section>

      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-6">
        <Button type="button" disabled={pending || !dirty} onClick={save}>
          {pending ? "Saving…" : "Save service area"}
        </Button>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {dirty ? "You have changes that are not saved." : "Everything is saved."}
        </p>
        {error ? (
          <p role="alert" className="w-full text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
