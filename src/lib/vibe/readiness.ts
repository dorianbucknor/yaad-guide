export type VibeReadinessItem =
  | "profile_approved"
  | "basics"
  | "address"
  | "pin"
  | "tickets"
  | "cover_photo"
  | "slots";

export type VibeReadinessInput = {
  profileApproved: boolean;
  description: string | null;
  area: string | null;
  addressLine1: string | null;
  town: string | null;
  parish: string | null;
  latitude: number | null;
  longitude: number | null;
  ticketCount: number;
  hasCoverPhoto: boolean;
  futureOpenSlotCount: number;
  ruleCount: number;
  autoGenerate: boolean;
};

const filled = (value: string | null): boolean => (value ?? "").trim() !== "";

/** What a listing still needs before it can be submitted. Mirrors vibe_listing_is_ready in SQL. */
export function vibeReadiness(input: VibeReadinessInput): { ready: boolean; missing: VibeReadinessItem[] } {
  const missing: VibeReadinessItem[] = [];
  if (!input.profileApproved) missing.push("profile_approved");
  if (!filled(input.description) || !filled(input.area)) missing.push("basics");
  if (!filled(input.addressLine1) || !filled(input.town) || !filled(input.parish)) missing.push("address");
  if (input.latitude === null || input.longitude === null) missing.push("pin");
  if (input.ticketCount < 1) missing.push("tickets");
  if (!input.hasCoverPhoto) missing.push("cover_photo");
  const hasSlots = input.futureOpenSlotCount > 0 || (input.autoGenerate && input.ruleCount > 0);
  if (!hasSlots) missing.push("slots");
  return { ready: missing.length === 0, missing };
}
