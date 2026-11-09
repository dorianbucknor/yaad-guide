import { describe, expect, it } from "vitest";

import { checklistSteps, profileMode } from "./checklist";
import type { VendorOverview } from "./types";

const empty: VendorOverview = {
  userId: "u1",
  profile: null,
  vehicles: [],
  documents: [],
  transfers: [],
  hasGovernmentId: false,
  readiness: { ready: false, missing: ["Government ID", "JTB license", "A vehicle"] },
};

const draft: VendorOverview = {
  ...empty,
  profile: {
    id: "p1",
    businessName: null,
    primaryRegion: "St. Ann",
    status: "draft",
    reviewNote: null,
    submittedAt: null,
  },
};

const ready: VendorOverview = {
  ...draft,
  vehicles: [
    {
      id: "v1",
      vehicleType: "SUV",
      make: "Toyota",
      model: "Noah",
      year: 2020,
      plate: "AB1234",
      passengerCapacity: 7,
      isActive: true,
    },
  ],
  hasGovernmentId: true,
  readiness: { ready: true, missing: [] },
};

const states = (overview: VendorOverview | null) =>
  Object.fromEntries(checklistSteps(overview).map((s) => [s.key, s.state]));

describe("checklistSteps", () => {
  it("starts at the business step when there is no profile", () => {
    expect(states(null)).toEqual({
      business: "todo",
      vehicles: "locked",
      documents: "locked",
      review: "locked",
    });
  });

  it("opens vehicles and documents once the business is saved", () => {
    expect(states(draft)).toEqual({
      business: "done",
      vehicles: "todo",
      documents: "todo",
      review: "locked",
    });
  });

  it("marks everything done and review open when the profile is ready", () => {
    expect(states(ready)).toEqual({
      business: "done",
      vehicles: "done",
      documents: "done",
      review: "todo",
    });
  });

  it("keeps documents open while a document item is missing", () => {
    const missingDoc = {
      ...ready,
      readiness: { ready: false, missing: ["JTB license"] },
    };
    expect(states(missingDoc).documents).toBe("todo");
    expect(states(missingDoc).review).toBe("locked");
  });

  it("marks review done once the profile is pending or approved", () => {
    const pending = { ...ready, profile: { ...ready.profile!, status: "pending" as const } };
    expect(states(pending).review).toBe("done");
  });

  it("links each step to its onboarding page", () => {
    expect(checklistSteps(draft).map((s) => s.href)).toEqual([
      "/v/move/onboarding/business",
      "/v/move/onboarding/vehicles",
      "/v/move/onboarding/documents",
      "/v/move/onboarding/review",
    ]);
  });
});

describe("profileMode", () => {
  it("lets a draft or rejected profile edit everything", () => {
    expect(profileMode(draft)).toBe("edit");
    expect(profileMode({ ...draft, profile: { ...draft.profile!, status: "rejected" } })).toBe("edit");
  });
  it("lets an approved profile only add vehicles and replace documents", () => {
    expect(profileMode({ ...draft, profile: { ...draft.profile!, status: "approved" } })).toBe("add");
  });
  it("locks a pending profile", () => {
    expect(profileMode({ ...draft, profile: { ...draft.profile!, status: "pending" } })).toBe("locked");
  });
  it("treats no profile as editable", () => {
    expect(profileMode(null)).toBe("edit");
  });
});
