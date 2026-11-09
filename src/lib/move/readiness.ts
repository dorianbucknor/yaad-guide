export type ReadinessItem =
  | "profile_approved"
  | "vehicle"
  | "luggage"
  | "photos"
  | "profile_photo"
  | "coverage"
  | "pricing"
  | "availability";

export const REQUIRED_PHOTO_KINDS = ["front", "rear", "interior", "luggage"] as const;

export type ReadinessInput = {
  profileApproved: boolean;
  vehicle: { luggageLarge: number; luggageCarryOn: number; photoKinds: readonly string[] } | null;
  profilePhotoVerified: boolean;
  islandWide: boolean;
  placeCount: number;
  flatRateCount: number;
  baseFare: number | null;
  perKm: number | null;
  windowCount: number;
};

/** What a listing still needs before it can be submitted or stay live. */
export function readiness(input: ReadinessInput): { ready: boolean; missing: ReadinessItem[] } {
  const missing: ReadinessItem[] = [];
  if (!input.profileApproved) missing.push("profile_approved");
  if (!input.vehicle) {
    missing.push("vehicle");
  } else {
    if (input.vehicle.luggageLarge + input.vehicle.luggageCarryOn <= 0) missing.push("luggage");
    if (!REQUIRED_PHOTO_KINDS.every((kind) => input.vehicle?.photoKinds.includes(kind))) missing.push("photos");
  }
  if (!input.profilePhotoVerified) missing.push("profile_photo");
  if (!input.islandWide && input.placeCount < 1) missing.push("coverage");
  const hasFormula = input.baseFare !== null && input.perKm !== null;
  if (input.flatRateCount < 1 && !hasFormula) missing.push("pricing");
  if (input.windowCount < 1) missing.push("availability");
  return { ready: missing.length === 0, missing };
}
