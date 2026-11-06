"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { applyFailure } from "@/components/auth/apply-failure";
import { TextField } from "@/components/auth/text-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { vehicleSchema, VEHICLE_TYPES } from "@/lib/schemas/vendor";
import { addVehicleAction, requestTransferAction } from "@/lib/vendor/actions";

import { SelectField } from "./select-field";

export function VehicleForm(): React.JSX.Element {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicatePlate, setDuplicatePlate] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    control,
    reset,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { make: "", model: "", plate: "" },
  });

  const onSubmit = handleSubmit(
    (values) => {
      setFormError(null);
      setDuplicatePlate(null);
      startTransition(async () => {
        const result = await addVehicleAction(values);
        if (result.ok) {
          toast.success("Vehicle added");
          reset({ make: "", model: "", plate: "" });
          router.refresh();
        } else {
          const message = applyFailure(result, setError);
          if (result.fieldErrors?.plate) setDuplicatePlate(String(getValues("plate")));
          setFormError(result.fieldErrors?.plate ? null : message);
          toast.error(message);
        }
      });
    },
    () => toast.error("Please fill in the required fields."),
  );

  const requestTransfer = (): void => {
    if (!duplicatePlate) return;
    startTransition(async () => {
      const result = await requestTransferAction({ plate: duplicatePlate });
      if (result.ok) {
        toast.success("Transfer requested");
        setDuplicatePlate(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Controller
          control={control}
          name="vehicleType"
          render={({ field }) => (
            <SelectField
              id="vehicle-type"
              label="Vehicle type"
              placeholder="Choose a type"
              options={VEHICLE_TYPES}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.vehicleType?.message}
            />
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="make" label="Make" placeholder="Toyota" error={errors.make?.message} {...register("make")} />
          <TextField id="model" label="Model" placeholder="Noah" error={errors.model?.message} {...register("model")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            id="year"
            label="Year"
            inputMode="numeric"
            placeholder="2020"
            error={errors.year?.message}
            {...register("year")}
          />
          <TextField
            id="plate"
            label="Plate number"
            autoCapitalize="characters"
            placeholder="1234 AB"
            error={errors.plate?.message}
            {...register("plate")}
          />
          <TextField
            id="capacity"
            label="Passengers"
            inputMode="numeric"
            placeholder="7"
            error={errors.passengerCapacity?.message}
            {...register("passengerCapacity")}
          />
        </div>
        {duplicatePlate ? (
          <Alert>
            <AlertTitle>That plate belongs to another vendor</AlertTitle>
            <AlertDescription>
              If you now own this vehicle, ask for a transfer. The current owner agrees, then an
              admin approves.
              <div className="mt-3">
                <Button type="button" variant="outline" disabled={pending} onClick={requestTransfer}>
                  Request a transfer
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}
        {formError ? <FieldError>{formError}</FieldError> : null}
        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add vehicle"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
