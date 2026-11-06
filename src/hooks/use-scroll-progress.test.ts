import { describe, expect, it } from "vitest";

import { progressThrough } from "./use-scroll-progress";

const VH = 800;
const HEIGHT = 2000;
const END_TOP = -(HEIGHT - VH);

describe("progressThrough", () => {
  it("is 0 when the section top is at 75% of the viewport", () => {
    expect(progressThrough(600, HEIGHT, VH)).toBe(0);
  });

  it("is 1 when the section bottom reaches the viewport bottom", () => {
    expect(progressThrough(END_TOP, HEIGHT, VH)).toBe(1);
  });

  it("is about 0.5 midway between start and end", () => {
    expect(progressThrough((600 + END_TOP) / 2, HEIGHT, VH)).toBeCloseTo(0.5, 5);
  });

  it("clamps to 1 far above and 0 far below", () => {
    expect(progressThrough(-100000, HEIGHT, VH)).toBe(1);
    expect(progressThrough(100000, HEIGHT, VH)).toBe(0);
  });

  it("returns a finite number in 0-1 for degenerate inputs", () => {
    for (const value of [
      progressThrough(0, 0, VH),
      progressThrough(Number.NaN, HEIGHT, VH),
      progressThrough(0, Number.NaN, VH),
      progressThrough(0, HEIGHT, Number.NaN),
    ]) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});
