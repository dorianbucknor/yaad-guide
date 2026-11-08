"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { applyFailure } from "@/components/auth/apply-failure";
import { TextField } from "@/components/auth/text-field";
import { ItemSelect } from "@/components/move/item-select";
import { useSave } from "@/components/move/use-save";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { resolveSuggestionAction, savePlaceAction } from "@/lib/move/admin-actions";
import type { AdminPlace, PlaceSuggestionRow } from "@/lib/move/admin-queries";
import { PLACE_KINDS, placeSchema } from "@/lib/schemas/move";

const KIND_ITEMS = PLACE_KINDS.map((k) => ({ value: k, label: k.replace("_", " ") }));
const toNumber = (value: string): number => (value.trim() === "" ? Number.NaN : Number(value));
const EMPTY = { name: "", kind: undefined, parish: "", lat: undefined, lng: undefined, active: true };

export function PlacesAdmin({
  places,
  suggestions,
}: {
  places: AdminPlace[];
  suggestions: PlaceSuggestionRow[];
}): React.JSX.Element {
  const { pending, run } = useSave();
  const [editingId, setEditingId] = useState<string | undefined>();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(placeSchema), defaultValues: EMPTY as never });

  const edit = (p: AdminPlace) => {
    setEditingId(p.id);
    reset({ name: p.name, kind: p.kind as (typeof PLACE_KINDS)[number], parish: p.parish, lat: p.lat, lng: p.lng, active: p.active });
  };
  const clear = () => {
    setEditingId(undefined);
    reset(EMPTY as never);
  };

  const save = handleSubmit((values) =>
    run(() => savePlaceAction({ ...values, id: editingId }), {
      success: editingId ? "Place updated" : "Place added",
      onFail: (result) => applyFailure(result, setError),
      onDone: clear,
    }),
  );

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="suggestions-heading" className="flex flex-col gap-4">
        <h2 id="suggestions-heading" className="text-xl font-semibold">
          Suggestions from vendors
        </h2>
        {suggestions.length === 0 ? <p className="text-muted-foreground">No open suggestions.</p> : null}
        <ul className="flex flex-col gap-2">
          {suggestions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-muted-foreground">
                  From {s.businessName}
                  {s.note ? ` · ${s.note}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={pending} onClick={() => run(() => resolveSuggestionAction({ id: s.id, status: "added" }), { success: "Marked as added" })}>
                  Mark added
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => resolveSuggestionAction({ id: s.id, status: "dismissed" }), { success: "Dismissed" })}>
                  Dismiss
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="form-heading" className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
        <h2 id="form-heading" className="text-xl font-semibold">
          {editingId ? "Edit place" : "Add a place"}
        </h2>
        <form onSubmit={save} noValidate>
          <FieldGroup>
            <TextField id="place-name" label="Name" error={errors.name?.message} {...register("name")} />
            <Controller
              control={control}
              name="kind"
              render={({ field }) => (
                <ItemSelect id="place-kind" label="Kind" items={KIND_ITEMS} value={field.value ?? null} onChange={field.onChange} error={errors.kind?.message} />
              )}
            />
            <TextField id="place-parish" label="Parish" error={errors.parish?.message} {...register("parish")} />
            <TextField id="place-lat" label="Latitude" type="number" step="0.00001" inputMode="decimal" error={errors.lat?.message} {...register("lat", { setValueAs: toNumber })} />
            <TextField id="place-lng" label="Longitude" type="number" step="0.00001" inputMode="decimal" error={errors.lng?.message} {...register("lng", { setValueAs: toNumber })} />
            <Controller
              control={control}
              name="active"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Switch id="place-active" checked={field.value} onCheckedChange={field.onChange} />
                  <FieldLabel htmlFor="place-active">Offered to vendors and travelers</FieldLabel>
                </Field>
              )}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : editingId ? "Save changes" : "Add place"}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={clear}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </FieldGroup>
        </form>
      </section>

      <section aria-labelledby="places-heading" className="flex flex-col gap-4">
        <h2 id="places-heading" className="text-xl font-semibold">
          All places ({places.length})
        </h2>
        <div className="rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Parish</TableHead>
                <TableHead>
                  <span className="sr-only">Action</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {places.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.name} {p.active ? null : <Badge variant="outline">Retired</Badge>}
                  </TableCell>
                  <TableCell>{p.kind.replace("_", " ")}</TableCell>
                  <TableCell>{p.parish}</TableCell>
                  <TableCell className="text-right">
                    <Button type="button" size="sm" variant="outline" aria-label={`Edit ${p.name}`} onClick={() => edit(p)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
