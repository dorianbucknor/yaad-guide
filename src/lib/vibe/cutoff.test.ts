import { describe, expect, it } from "vitest";

import { splitCutoff, toCutoffMinutes } from "./cutoff";

describe("booking cutoff", () => {
  it("shows the largest unit that divides evenly", () => {
    expect(splitCutoff(60)).toEqual({ value: 1, unit: "hours" });
    expect(splitCutoff(90)).toEqual({ value: 90, unit: "minutes" });
    expect(splitCutoff(1440)).toEqual({ value: 1, unit: "days" });
    expect(splitCutoff(0)).toEqual({ value: 0, unit: "minutes" });
    expect(splitCutoff(10080)).toEqual({ value: 7, unit: "days" });
  });

  it("converts back to minutes", () => {
    expect(toCutoffMinutes(7, "days")).toBe(10080);
    expect(toCutoffMinutes(2, "hours")).toBe(120);
    expect(toCutoffMinutes(45, "minutes")).toBe(45);
  });
});
