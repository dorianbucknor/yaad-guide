"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemSeparator, ItemTitle } from "@/components/ui/item";
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
      <Empty className="border">
        <EmptyDescription>No vehicles yet. Add the one you drive now; you can add more later.</EmptyDescription>
      </Empty>
    );
  }

  return (
    <ItemGroup className="rounded-xl border border-border">
      {vehicles.map((vehicle, index) => (
        <div key={vehicle.id}>
          {index > 0 ? <ItemSeparator /> : null}
          <Item className="flex-wrap">
            <ItemContent>
              <ItemTitle>
                {vehicle.make} {vehicle.model}
                {vehicle.isActive ? <Badge>Driving now</Badge> : null}
              </ItemTitle>
              <ItemDescription className="tabular-nums">
                {vehicle.plate} · {vehicle.vehicleType} · {vehicle.year} · {vehicle.passengerCapacity} passengers
              </ItemDescription>
            </ItemContent>
            {mode === "locked" ? null : (
              <ItemActions>
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
              </ItemActions>
            )}
          </Item>
        </div>
      ))}
    </ItemGroup>
  );
}
