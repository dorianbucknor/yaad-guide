/** Oldest submission first; the input is left untouched. */
export function sortPending<T extends { submittedAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}

/**
 * Whether a document of the owner's account is part of this one profile's review. The person's
 * government ID is shared; business documents belong to their own business; vehicle documents
 * to that profile's vehicles.
 */
export function belongsToProfile(
  doc: { doc_type: string; vendor_profile_id: string | null; vehicle_id: string | null },
  profileId: string,
  vehicleIds: readonly string[],
): boolean {
  if (doc.vehicle_id !== null) return vehicleIds.includes(doc.vehicle_id);
  if (doc.doc_type === "government_id") return true;
  return doc.vendor_profile_id === profileId;
}
