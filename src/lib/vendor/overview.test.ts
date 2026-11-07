import { describe, expect, it } from "vitest";

import { buildOverview, type RawOverview } from "./overview";

const base: RawOverview = {
  userId: "u1",
  profile: {
    id: "p1",
    business_name: null,
    primary_region: "St. Ann",
    status: "draft",
    review_note: null,
    submitted_at: null,
  },
  vehicles: [],
  documents: [],
  transfers: [],
};

describe("buildOverview", () => {
  it("is not ready and has no ID for an empty draft", () => {
    const overview = buildOverview(base, "2026-11-06");
    expect(overview.hasGovernmentId).toBe(false);
    expect(overview.readiness.ready).toBe(false);
    expect(overview.profile?.primaryRegion).toBe("St. Ann");
  });

  it("marks a transfer I asked for as outgoing and one for my vehicle as incoming", () => {
    const overview = buildOverview(
      {
        ...base,
        transfers: [
          { id: "t1", status: "requested", vehicle_id: "v1", requested_by: "u1", vendor_vehicles: { plate: "AB1", make: "Toyota", model: "Noah" } },
          { id: "t2", status: "requested", vehicle_id: "v2", requested_by: "u2", vendor_vehicles: { plate: "CD2", make: "Honda", model: "Fit" } },
        ],
      },
      "2026-11-06",
    );
    expect(overview.transfers.map((t) => t.direction)).toEqual(["outgoing", "incoming"]);
    expect(overview.transfers[1].label).toBe("Honda Fit");
  });

  it("recognizes a government ID and a null profile", () => {
    const overview = buildOverview(
      {
        ...base,
        profile: null,
        documents: [
          { id: "d1", doc_type: "government_id", vehicle_id: null, expires_on: null, verified: false, storage_path: "u1/d1.png" },
        ],
      },
      "2026-11-06",
    );
    expect(overview.profile).toBeNull();
    expect(overview.hasGovernmentId).toBe(true);
  });
});
