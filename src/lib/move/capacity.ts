import type { Party, VehicleCapacity } from "./types";

/** Seats, large bags and carry-ons are separate limits. */
export function fits(vehicle: VehicleCapacity, party: Party): boolean {
  return (
    party.size >= 1 &&
    party.size <= vehicle.seats &&
    party.large <= vehicle.large &&
    party.carryOn <= vehicle.carryOn
  );
}
