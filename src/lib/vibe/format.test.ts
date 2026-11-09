import { describe, expect, it } from "vitest";

import { formatCutoff, formatDuration, formatPrice } from "./format";

describe("formatPrice", () => {
  it("shows the currency with two decimals", () => {
    expect(formatPrice(20, "usd")).toBe("US$20.00");
    expect(formatPrice(2500, "jmd")).toBe("J$2,500.00");
    expect(formatPrice(16.99, "usd")).toBe("US$16.99");
  });

  it("says Free for zero", () => {
    expect(formatPrice(0, "usd")).toBe("Free");
    expect(formatPrice(0, "jmd")).toBe("Free");
  });
});

describe("formatDuration", () => {
  it("uses minutes, hours, or both", () => {
    expect(formatDuration(45)).toBe("45 minutes");
    expect(formatDuration(60)).toBe("1 hour");
    expect(formatDuration(120)).toBe("2 hours");
    expect(formatDuration(90)).toBe("1 hour 30 minutes");
  });
});

describe("formatCutoff", () => {
  it("names the largest unit and handles no cutoff", () => {
    expect(formatCutoff(60)).toBe("1 hour before it starts");
    expect(formatCutoff(30)).toBe("30 minutes before it starts");
    expect(formatCutoff(2880)).toBe("2 days before it starts");
    expect(formatCutoff(0)).toBe("until it starts");
  });
});
