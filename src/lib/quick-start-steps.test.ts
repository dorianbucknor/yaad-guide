import { describe, expect, it } from "vitest";
import { firstInvalidStep } from "./quick-start-steps";

const err = { type: "custom", message: "x" };

describe("firstInvalidStep", () => {
	it("returns the STAY step for a stay error", () => {
		expect(firstInvalidStep({ stay: { area: err } })).toBe(1);
	});

	it("returns the earliest step when several cards have errors", () => {
		expect(
			firstInvalidStep({
				move: { passengers: err },
				stay: { area: err },
			}),
		).toBe(0);
	});

	it("returns the VIBE step for an interests error", () => {
		expect(firstInvalidStep({ interests: { 0: err } })).toBe(2);
	});

	it("returns the TRIP step for a root error", () => {
		expect(firstInvalidStep({ root: err })).toBe(2);
	});

	it("returns the TRIP step when there are no errors", () => {
		expect(firstInvalidStep({})).toBe(2);
	});
});
