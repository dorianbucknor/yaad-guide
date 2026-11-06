"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { removeVehicleAction, setActiveVehicleAction } from "@/lib/vendor/actions";
import type { VendorVehicle } from "@/lib/vendor/types";

export function VehicleList({
  vehicles,
  mode,
}: {
  vehicles: VendorVehicle[];
  mode: "edit" | "add" | "locked";
}): React.JSX.Element {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, done: string): void => {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(done);
        router.refresh();
      } else {
        toast.error(result.error ?? "Something went wrong. Please try again.");
      }
    });
  };

  if (vehicles.length === 0) {
    return (
      <p className="text-muted-foreground">
        No vehicles yet. Add the one you drive now; you can add more later.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
      {vehicles.map((vehicle) => (
        <li key={vehicle.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="flex flex-wrap items-center gap-2 font-medium">
              {vehicle.make} {vehicle.model}
              {vehicle.isActive ? <Badge>Driving now</Badge> : null}
            </span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {vehicle.plate} · {vehicle.vehicleType} · {vehicle.year} · {vehicle.passengerCapacity} passengers
            </span>
          </div>
          {mode === "locked" ? null : (
            <div className="flex flex-wrap gap-2">
              {vehicle.isActive ? null : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => setActiveVehicleAction(vehicle.id), "Vehicle set")}
                >
                  Drive this one
                </Button>
              )}
              {mode === "edit" && !vehicle.isActive ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => removeVehicleAction(vehicle.id), "Vehicle removed")}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
