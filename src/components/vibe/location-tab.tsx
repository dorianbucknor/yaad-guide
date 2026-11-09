"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { applyFailure } from "@/components/auth/apply-failure";
import { TextField } from "@/components/auth/text-field";
import { useSave } from "@/components/move/use-save";
import { SelectField } from "@/components/vendor/select-field";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Skeleton } from "@/components/skeleton";
import { PARISHES, addressSchema, type AddressInput } from "@/lib/schemas/vibe";
import { saveLocationAction } from "@/lib/vibe/actions";
import type { VibeListingView } from "@/lib/vibe/types";

type Output = ReturnType<typeof addressSchema.parse>;

const PinPicker = dynamic(() => import("./pin-picker"), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full rounded-2xl" aria-busy="true" />,
});

/** The venue's street address, typed by hand, and its exact pin. Travelers see only the area until they have booked. */
export function LocationTab({ listing }: { listing: VibeListingView }): React.JSX.Element {
  const { pending, run } = useSave();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<AddressInput, unknown, Output>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      addressLine1: listing.addressLine1 ?? "",
      addressLine2: listing.addressLine2 ?? "",
      town: listing.town ?? "",
      parish: (listing.parish ?? "") as AddressInput["parish"],
      latitude: listing.latitude ?? (undefined as unknown as number),
      longitude: listing.longitude ?? (undefined as unknown as number),
    },
  });
  const latitude = Number(watch("latitude"));
  const longitude = Number(watch("longitude"));
  const pinned = Number.isFinite(latitude) && Number.isFinite(longitude) && watch("latitude") !== undefined;

  const save = handleSubmit((values) => {
    setFormError(null);
    run(() => saveLocationAction(listing.id, values), {
      success: "Location saved",
      onFail: (result) => setFormError(applyFailure(result, setError)),
    });
  });

  return (
    <form onSubmit={save} noValidate className="flex max-w-3xl flex-col gap-8">
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Address</FieldLegend>
          <FieldDescription>
            Travelers see only the area until they have booked. After that they get this address and a button that opens the map.
          </FieldDescription>
          <FieldGroup>
            <TextField
              id="address-line1"
              label="Street address"
              autoComplete="address-line1"
              error={errors.addressLine1?.message}
              {...register("addressLine1")}
            />
            <TextField
              id="address-line2"
              label="Address line 2 (optional)"
              autoComplete="address-line2"
              error={errors.addressLine2?.message}
              {...register("addressLine2")}
            />
            <TextField id="address-town" label="Town" autoComplete="address-level2" error={errors.town?.message} {...register("town")} />
            <Controller
              control={control}
              name="parish"
              render={({ field }) => (
                <SelectField
                  id="address-parish"
                  label="Parish"
                  placeholder="Choose a parish"
                  options={PARISHES}
                  value={field.value || undefined}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.parish?.message}
                />
              )}
            />
          </FieldGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Pin on the map</FieldLegend>
          <FieldDescription>
            Click the map or drag the pin to the exact entrance. You can also type the coordinates, for example copied from a map app.
          </FieldDescription>
          <PinPicker
            latitude={pinned ? latitude : null}
            longitude={pinned ? longitude : null}
            onChange={(lat, lng) => {
              setValue("latitude", lat, { shouldValidate: true, shouldDirty: true });
              setValue("longitude", lng, { shouldValidate: true, shouldDirty: true });
            }}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="pin-latitude"
              label="Latitude"
              type="number"
              inputMode="decimal"
              step="any"
              error={errors.latitude?.message}
              {...register("latitude", { valueAsNumber: true })}
            />
            <TextField
              id="pin-longitude"
              label="Longitude"
              type="number"
              inputMode="decimal"
              step="any"
              error={errors.longitude?.message}
              {...register("longitude", { valueAsNumber: true })}
            />
          </div>
        </FieldSet>

        {formError ? <FieldError>{formError}</FieldError> : null}
        <Field orientation="horizontal">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save location"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
