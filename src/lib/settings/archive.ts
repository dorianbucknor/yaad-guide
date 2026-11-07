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

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-11-13" becomes "13 November 2026"; anything that is not a real date gives null. */
export function formatUntil(value: string | undefined): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
