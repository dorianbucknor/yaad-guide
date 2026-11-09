/** A free ticket costs nothing and carries no commission. */
export function isFree(price: number): boolean {
  return price === 0;
}

/** The price a traveler pays: the percentage taken off, rounded half up to 2 decimals. */
export function discountedPrice(price: number, discountPercent: number | null): number {
  if (!discountPercent) return price;
  const cents = Math.round(price * 100);
  return Math.round((cents * (100 - discountPercent)) / 100) / 100;
}
