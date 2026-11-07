export const ARCHIVE_DAYS = 7;

/** Archive time plus seven days, as yyyy-MM-dd in UTC. */
export function purgeDate(archivedAt: string): string {
  const date = new Date(archivedAt);
  date.setUTCDate(date.getUTCDate() + ARCHIVE_DAYS);
  return date.toISOString().slice(0, 10);
}

export function isDeleteConfirmed(text: string): boolean {
  return text.trim() === "DELETE";
}
