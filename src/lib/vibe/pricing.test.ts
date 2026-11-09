import { describe, expect, it } from "vitest";

import { discountedPrice, isFree } from "./pricing";

describe("ticket pricing", () => {
  it("takes the percentage off and rounds to 2 decimals", () => {
    expect(discountedPrice(19.99, 15)).toBe(16.99);
    expect(discountedPrice(100, 25)).toBe(75);
    expect(discountedPrice(0.1, 5)).toBe(0.1);
  });

  it("leaves the price alone without a discount", () => {
    expect(discountedPrice(10, null)).toBe(10);
    expect(discountedPrice(10, 0)).toBe(10);
  });

  it("keeps a free ticket free", () => {
    expect(discountedPrice(0, 50)).toBe(0);
    expect(isFree(0)).toBe(true);
    expect(isFree(0.01)).toBe(false);
  });
});
