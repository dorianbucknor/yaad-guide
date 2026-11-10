import type { Client } from "@/lib/auth/action-helpers";
import type { VendorProfile, VendorStatus } from "@/lib/vendor/types";

/** A business the vendor runs. It is a vendor profile; a person can have several in the VIBE category. */
export type VibeEntity = VendorProfile;

/** Every VIBE entity the account owns, oldest first. */
export async function listMyVibeEntities(supabase: Client, userId: string): Promise<VibeEntity[]> {
  const { data } = await supabase
    .from("vendor_profiles")
    .select("id, business_name, primary_region, status, review_note, submitted_at")
    .eq("account_id", userId)
    .eq("category", "vibe")
    .order("created_at", { ascending: true });
  return (data ?? []).map((row) => ({
    id: row.id as string,
    businessName: row.business_name as string | null,
    primaryRegion: row.primary_region as string,
    status: row.status as VendorStatus,
    reviewNote: row.review_note as string | null,
    submittedAt: row.submitted_at as string | null,
  }));
}

/**
 * The entity an action is for. With an id, that entity if it is in the list. Without one, the only
 * entity if there is exactly one. Never picks between several: the caller must ask which.
 */
export function pickVibeEntity(entities: readonly VibeEntity[], entityId: string | undefined): VibeEntity | null {
  if (entityId) return entities.find((e) => e.id === entityId) ?? null;
  return entities.length === 1 ? entities[0] : null;
}

/** `pickVibeEntity` over the account's own entities. */
export async function resolveVibeEntity(
  supabase: Client,
  userId: string,
  entityId: string | undefined,
): Promise<VibeEntity | null> {
  return pickVibeEntity(await listMyVibeEntities(supabase, userId), entityId);
}
