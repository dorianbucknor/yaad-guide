"use client";

import { useState } from "react";

import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { saveListingAction, setCoverageAction, suggestPlaceAction } from "@/lib/move/actions";
import type { MoveListingView, PlaceRow } from "@/lib/move/queries";

import { listingPayload, NEED_LISTING_TEXT } from "./listing-payload";
import { PlacePicker } from "./place-picker";
import { useSave } from "./use-save";

export function CoverageTab({ view, places }: { view: MoveListingView; places: PlaceRow[] }): React.JSX.Element {
  const { pending, run } = useSave();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(view.placeIds));
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [suggestError, setSuggestError] = useState<string | undefined>();

  if (!view.listing) return <p className="text-muted-foreground">{NEED_LISTING_TEXT}</p>;
  const islandWide = view.listing.islandWide;

  return (
    <div className="flex flex-col gap-10">
      <Field orientation="horizontal">
        <Switch
          id="island-wide"
          checked={islandWide}
          disabled={pending}
          onCheckedChange={(next) =>
            run(() => saveListingAction(listingPayload(view, { islandWide: next })), {
              success: next ? "Serving the whole island" : "Back to chosen places",
            })
          }
        />
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor="island-wide">I serve the whole island</FieldLabel>
          <FieldDescription>Any pickup and drop-off on our list counts as covered.</FieldDescription>
        </div>
      </Field>

      <section className="flex flex-col gap-4" aria-labelledby="places-heading">
        <h2 id="places-heading" className="text-lg font-semibold">
          Places you serve
        </h2>
        {islandWide ? (
          <p className="text-sm text-muted-foreground">Turn off island-wide to choose specific places.</p>
        ) : (
          <>
            <PlacePicker places={places} selected={selected} onChange={setSelected} disabled={pending} />
            <Button
              type="button"
              className="self-start"
              disabled={pending}
              onClick={() => run(() => setCoverageAction({ placeIds: [...selected] }), { success: "Places saved" })}
            >
              {pending ? "Saving…" : "Save places"}
            </Button>
          </>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 md:p-5" aria-labelledby="suggest-heading">
        <h2 id="suggest-heading" className="text-base font-medium">
          Missing a place?
        </h2>
        <p className="text-sm text-muted-foreground">Suggest it and an admin will review it.</p>
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
  );
}
