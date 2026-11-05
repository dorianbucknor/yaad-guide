import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AREAS,
  INTERESTS,
  areaLabel,
  quickStartSchema,
  quickStartShape,
  tripStartDate,
  type QuickStartDraft,
} from "./quick-start";

const validMove = {
  kind: "taxi",
  passengers: 2,
  vehicle: "sedan",
  pickupDate: "2026-11-10",
  pickupTime: "09:30",
};

const validStay = {
  type: "hotel",
  area: "negril",
  rooms: 1,
  adults: 2,
  children: 0,
  checkIn: "2026-11-10",
  checkOut: "2026-11-15",
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-05T12:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("quickStartSchema", () => {
  it("accepts a move-only draft", () => {
    const result = quickStartSchema.safeParse({ move: validMove, interests: [] });
    expect(result.success).toBe(true);
  });

  it("rejects an empty draft", () => {
    const result = quickStartSchema.safeParse({ interests: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.length === 0);
      expect(issue?.message).toBe(
        "Choose at least one of getting around, where you'll stay or things to do",
      );
    }
  });

  it("rejects checkOut equal to checkIn", () => {
    const result = quickStartSchema.safeParse({
      stay: { ...validStay, checkOut: validStay.checkIn },
      interests: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path.join(".") === "stay.checkOut",
      );
      expect(issue?.message).toBe("Check-out must be after check-in");
    }
  });

  it("rejects checkOut before checkIn", () => {
    const result = quickStartSchema.safeParse({
      stay: { ...validStay, checkOut: "2026-11-09" },
      interests: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path)).toContainEqual(["stay", "checkOut"]);
    }
  });

  it("rejects a pickup date in the past", () => {
    const result = quickStartSchema.safeParse({
      move: { ...validMove, pickupDate: "2026-11-04" },
      interests: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path.join(".") === "move.pickupDate",
      );
      expect(issue?.message).toBe("Pick a date from today onwards");
    }
  });

  it("accepts today", () => {
    const result = quickStartSchema.safeParse({
      move: { ...validMove, pickupDate: "2026-11-05" },
      interests: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a check-in date in the past", () => {
    const result = quickStartSchema.safeParse({
      stay: { ...validStay, checkIn: "2026-11-04" },
      interests: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path)).toContainEqual(["stay", "checkIn"]);
    }
  });

  it.each([0, -1, 2.5, NaN])("rejects passengers %s", (passengers) => {
    const result = quickStartSchema.safeParse({
      move: { ...validMove, passengers },
      interests: [],
    });
    expect(result.success).toBe(false);
  });

  it.each(["rooms", "adults"] as const)("rejects invalid %s", (field) => {
    for (const value of [0, -1, 2.5, NaN]) {
      const result = quickStartSchema.safeParse({
        stay: { ...validStay, [field]: value },
        interests: [],
      });
      expect(result.success).toBe(false);
    }
  });

  it("accepts children 0 and rejects -1", () => {
    expect(
      quickStartSchema.safeParse({ stay: { ...validStay, children: 0 }, interests: [] })
        .success,
    ).toBe(true);
    expect(
      quickStartSchema.safeParse({ stay: { ...validStay, children: -1 }, interests: [] })
        .success,
    ).toBe(false);
  });

  it("rejects an unknown interest id", () => {
    expect(quickStartSchema.safeParse({ interests: ["bungee"] }).success).toBe(false);
  });

  it("rejects an unknown area id", () => {
    const result = quickStartSchema.safeParse({
      stay: { ...validStay, area: "atlantis" },
      interests: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed date", () => {
    const result = quickStartSchema.safeParse({
      move: { ...validMove, pickupDate: "5/11/2026" },
      interests: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("quickStartShape", () => {
  it("accepts past dates", () => {
    const result = quickStartShape.safeParse({
      move: { ...validMove, pickupDate: "2020-01-01" },
      interests: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("areas and interests", () => {
  it("has 14 areas with labels", () => {
    expect(AREAS).toHaveLength(14);
    expect(areaLabel("kingston")).toBe("Kingston");
    expect(areaLabel("negril")).toBe("Negril (Westmoreland)");
  });

  it("has 17 interests", () => {
    expect(INTERESTS).toHaveLength(17);
  });
});

describe("tripStartDate", () => {
  it("returns the earliest of pickup and check-in", () => {
    const draft: QuickStartDraft = {
      move: { ...validMove, kind: "taxi", vehicle: "sedan", pickupDate: "2026-11-12" },
      stay: { ...validStay, type: "hotel", area: "negril", checkIn: "2026-11-10" },
      interests: [],
    };
    expect(tripStartDate(draft)).toBe("2026-11-10");
  });

  it("returns undefined for an interests-only draft", () => {
    expect(tripStartDate({ interests: ["beach"] })).toBeUndefined();
  });
});
