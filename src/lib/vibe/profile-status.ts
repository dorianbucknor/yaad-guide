import type { VendorStatus } from "@/lib/vendor/types";

/**
 * edit: new, draft or rejected, everything can change.
 * add: approved, a vendor may replace documents.
 * locked: pending, nothing changes until an admin decides.
 */
export type ProfileMode = "edit" | "add" | "locked";

export function vibeProfileMode(status: VendorStatus | undefined): ProfileMode {
  if (status === "pending") return "locked";
  if (status === "approved") return "add";
  return "edit";
}

/** What a Vibe profile still needs before it can be submitted. The venue permit is optional and never listed. */
export function vibeProfileMissing(input: {
  hasProfile: boolean;
  hasGovernmentId: boolean;
  hasRegistration: boolean;
}): string[] {
  const missing: string[] = [];
  if (!input.hasProfile) missing.push("Business details");
  if (!input.hasGovernmentId) missing.push("Government ID");
  if (!input.hasRegistration) missing.push("Business registration");
  return missing;
}
