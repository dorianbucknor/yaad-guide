import { describe, expect, it } from "vitest";

import { mergeRanges, subtractRange } from "./ranges";

const d = (iso: string): Date => new Date(`${iso}T00:00:00Z`);
const r = (a: string, b: string) => ({ start: d(a), end: d(b) });

describe("mergeRanges", () => {
  it("joins overlapping and touching ranges", () => {
    expect(mergeRanges([r("2026-12-05", "2026-12-08"), r("2026-12-01", "2026-12-06"), r("2026-12-08", "2026-12-10")])).toEqual([
      r("2026-12-01", "2026-12-10"),
    ]);
  });

  it("keeps separate ranges separate", () => {
    expect(mergeRanges([r("2026-12-10", "2026-12-12"), r("2026-12-01", "2026-12-03")])).toEqual([
      r("2026-12-01", "2026-12-03"),
      r("2026-12-10", "2026-12-12"),
    ]);
  });
});

describe("subtractRange", () => {
  const block = [r("2026-12-01", "2026-12-10")];

  it("splits a range when the cut is inside it", () => {
    expect(subtractRange(block, r("2026-12-04", "2026-12-06"))).toEqual([
      r("2026-12-01", "2026-12-04"),
      r("2026-12-06", "2026-12-10"),
    ]);
  });

  it("removes a range the cut covers", () => {
    expect(subtractRange(block, r("2026-11-30", "2026-12-11"))).toEqual([]);
  });

  it("trims one end", () => {
    expect(subtractRange(block, r("2026-12-08", "2026-12-12"))).toEqual([r("2026-12-01", "2026-12-08")]);
  });

  it("leaves a range the cut does not touch", () => {
    expect(subtractRange(block, r("2026-12-20", "2026-12-22"))).toEqual(block);
  });
});
