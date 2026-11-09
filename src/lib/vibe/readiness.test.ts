import { describe, expect, it } from "vitest";

import { vibeReadiness, type VibeReadinessInput } from "./readiness";

const complete: VibeReadinessInput = {
  profileApproved: true,
  description: "Raft down the river",
  area: "Ocho Rios",
  addressLine1: "1 Main Road",
  town: "Ocho Rios",
  parish: "St. Ann",
  latitude: 18.4,
  longitude: -77.1,
  ticketCount: 1,
  hasCoverPhoto: true,
  futureOpenSlotCount: 1,
  ruleCount: 0,
  autoGenerate: true,
};

describe("vibeReadiness", () => {
  it("is ready when everything is in", () => {
    expect(vibeReadiness(complete)).toEqual({ ready: true, missing: [] });
  });

  it("reports each missing item", () => {
    const result = vibeReadiness({
      ...complete,
      profileApproved: false,
      description: " ",
      addressLine1: null,
      latitude: null,
      ticketCount: 0,
      hasCoverPhoto: false,
      futureOpenSlotCount: 0,
    });
    expect(result.ready).toBe(false);
    expect(result.missing).toEqual(["profile_approved", "basics", "address", "pin", "tickets", "cover_photo", "slots"]);
  });

  it("needs the pin to have both coordinates", () => {
    expect(vibeReadiness({ ...complete, longitude: null }).missing).toEqual(["pin"]);
  });

  it("counts a schedule rule as slots only while auto generation is on", () => {
    const noSlots = { ...complete, futureOpenSlotCount: 0, ruleCount: 2 };
    expect(vibeReadiness({ ...noSlots, autoGenerate: true }).ready).toBe(true);
    expect(vibeReadiness({ ...noSlots, autoGenerate: false }).missing).toEqual(["slots"]);
  });
});
