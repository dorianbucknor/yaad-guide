import { describe, expect, it } from "vitest";

import { fits } from "./capacity";

const sedan = { seats: 4, large: 3, carryOn: 3 };

describe("fits", () => {
  it("accepts a party within seats and bag limits", () => {
    expect(fits(sedan, { size: 3, large: 2, carryOn: 2 })).toBe(true);
  });

  it("rejects too many passengers", () => {
    expect(fits(sedan, { size: 5, large: 0, carryOn: 0 })).toBe(false);
  });

  it("rejects four people with six large bags in a car that holds three", () => {
    expect(fits(sedan, { size: 4, large: 6, carryOn: 0 })).toBe(false);
  });

  it("counts large bags and carry-ons separately", () => {
    expect(fits(sedan, { size: 2, large: 0, carryOn: 4 })).toBe(false);
  });

  it("rejects a party of zero", () => {
    expect(fits(sedan, { size: 0, large: 0, carryOn: 0 })).toBe(false);
  });
});
