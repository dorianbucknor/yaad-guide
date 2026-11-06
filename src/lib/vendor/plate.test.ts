import { describe, expect, it } from "vitest";

import { normalizePlate } from "./plate";

describe("normalizePlate", () => {
  it.each(["1234 ab", " 1234AB ", "1234AB"])("normalizes %j", (input) => {
    expect(normalizePlate(input)).toBe("1234AB");
  });
});
