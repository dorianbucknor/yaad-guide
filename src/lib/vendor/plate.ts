/** Plates compare as trimmed, upper-case and without spaces. */
export function normalizePlate(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}
