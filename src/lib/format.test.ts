import { describe, expect, it } from "vitest";
import { formatTime12h } from "./format";

describe("formatTime12h", () => {
  it("formats an afternoon time", () => {
    expect(formatTime12h("14:30")).toBe("2:30 PM");
  });

  it("formats just after midnight", () => {
    expect(formatTime12h("00:05")).toBe("12:05 AM");
  });

  it("returns malformed input unchanged", () => {
    expect(formatTime12h("25:99")).toBe("25:99");
  });
});
