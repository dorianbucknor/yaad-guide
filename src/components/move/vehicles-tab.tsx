"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { applyFailure } from "@/components/auth/apply-failure";
import { TextField } from "@/components/auth/text-field";
import { VehicleForm } from "@/components/vendor/vehicle-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveLuggageAction } from "@/lib/move/actions";
import type { MoveListingView, MoveVehicleView } from "@/lib/move/queries";
import { luggageSchema } from "@/lib/schemas/move";
import { removeVehicleAction, setActiveVehicleAction } from "@/lib/vendor/actions";

import { useSave } from "./use-save";
import { VehiclePhotos } from "./vehicle-photos";

const luggageForm = luggageSchema.pick({ large: true, carryOn: true });

function LuggageForm({ vehicle }: { vehicle: MoveVehicleView }): React.JSX.Element {
  const { pending, run } = useSave();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(luggageForm),
    defaultValues: { large: vehicle.luggageLarge, carryOn: vehicle.luggageCarryOn },
  });
  const save = handleSubmit((values) =>
    run(() => saveLuggageAction({ vehicleId: vehicle.id, ...values }), {
      success: "Luggage space saved",
      onFail: (result) => applyFailure(result, setError),
    }),
  );
  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={`luggage-large-${vehicle.id}`}
          label="Large bags that fit"
          type="number"
          inputMode="numeric"
          min="0"
          max="20"
          error={errors.large?.message}
          {...register("large", { valueAsNumber: true })}
        />
        <TextField
          id={`luggage-carry-on-${vehicle.id}`}
          label="Carry-on bags that fit"
          type="number"
          inputMode="numeric"
          min="0"
          max="20"
          error={errors.carryOn?.message}
          {...register("carryOn", { valueAsNumber: true })}
        />
      </div>
      <Button type="submit" variant="outline" className="self-start" disabled={pending}>
        {pending ? "Saving…" : "Save luggage space"}
      </Button>
    </form>
  );
}

function VehicleSection({ vehicle }: { vehicle: MoveVehicleView }): React.JSX.Element {
  const { pending, run } = useSave();
  return (
    <section className="flex flex-col gap-6" aria-labelledby={`vehicle-${vehicle.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={`vehicle-${vehicle.id}`} className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            {vehicle.label}
            {vehicle.isActive ? <Badge>Driving now</Badge> : null}
          </h2>
          <p className="text-sm tabular-nums text-muted-foreground">
            {vehicle.plate} · {vehicle.vehicleType} · {vehicle.seats} passengers
          </p>
        </div>
        {vehicle.isActive ? null : (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => run(() => setActiveVehicleAction(vehicle.id), { success: "Vehicle set" })}>
              Drive this one
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => run(() => removeVehicleAction(vehicle.id), { success: "Vehicle removed" })}>
              Remove
            </Button>
          </div>
        )}
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-medium">Luggage space</h3>
          <LuggageForm vehicle={vehicle} />
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-medium">Photos</h3>
          <VehiclePhotos vehicle={vehicle} />
        </div>
      </div>
    </section>
  );
}

/** Every vehicle on the profile, each with its luggage space and photos. Travelers see the one you drive now. */
export function VehiclesTab({ view }: { view: MoveListingView }): React.JSX.Element {
  const [adding, setAdding] = useState(false);
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[65ch] text-sm text-muted-foreground">
          Travelers see the vehicle you drive now, with its photos and how many bags it holds.
        </p>
        <Button type="button" onClick={() => setAdding(true)}>
          <PlusIcon aria-hidden /> Add a vehicle
        </Button>
      </div>

      {view.vehicles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          No vehicles yet. Add the one you drive now; you can add more later.
        </p>
      ) : (
        view.vehicles.map((vehicle, index) => (
          <div key={vehicle.id} className={index > 0 ? "border-t border-border pt-10" : undefined}>
            <VehicleSection vehicle={vehicle} />
          </div>
        ))
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a vehicle</DialogTitle>
            <DialogDescription>Enter the details and how many bags it holds. You can add its photos right after.</DialogDescription>
          </DialogHeader>
          <VehicleForm onAdded={() => setAdding(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
