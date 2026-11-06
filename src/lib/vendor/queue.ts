/** Oldest submission first; the input is left untouched. */
export function sortPending<T extends { submittedAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}
