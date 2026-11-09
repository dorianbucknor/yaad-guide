import { describe, expect, it } from "vitest";

import { vibeProfileMissing, vibeProfileMode } from "./profile-status";

describe("vibeProfileMode", () => {
  it("lets a new, draft or rejected profile change everything", () => {
    expect(vibeProfileMode(undefined)).toBe("edit");
    expect(vibeProfileMode("draft")).toBe("edit");
    expect(vibeProfileMode("rejected")).toBe("edit");
  });

  it("locks a pending profile and lets an approved one add and replace", () => {
    expect(vibeProfileMode("pending")).toBe("locked");
    expect(vibeProfileMode("approved")).toBe("add");
  });
});

describe("vibeProfileMissing", () => {
  it("lists what a vibe vendor still needs, in the order the page shows it", () => {
    expect(vibeProfileMissing({ hasProfile: false, hasGovernmentId: false, hasRegistration: false })).toEqual([
      "Business details",
      "Government ID",
      "Business registration",
    ]);
  });

  it("is empty when the profile, ID and registration are in", () => {
    expect(vibeProfileMissing({ hasProfile: true, hasGovernmentId: true, hasRegistration: true })).toEqual([]);
  });

  it("does not ask for the optional venue permit", () => {
    const missing = vibeProfileMissing({ hasProfile: true, hasGovernmentId: true, hasRegistration: false });
    expect(missing).toEqual(["Business registration"]);
  });
});
