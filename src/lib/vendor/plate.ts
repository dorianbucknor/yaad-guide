/** Plates compare as upper-case letters and digits only: no spaces, dashes or dots. */
export function normalizePlate(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
