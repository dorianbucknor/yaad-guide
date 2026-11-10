import { describe, expect, it } from "vitest";

import { belongsToProfile, sortPending } from "./queue";

describe("sortPending", () => {
  it("puts the oldest submission first without changing the input", () => {
    const rows = [
      { id: "b", submittedAt: "2026-11-05T10:00:00Z" },
      { id: "a", submittedAt: "2026-11-01T10:00:00Z" },
      { id: "c", submittedAt: "2026-11-06T10:00:00Z" },
    ];
    expect(sortPending(rows).map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(rows.map((r) => r.id)).toEqual(["b", "a", "c"]);
  });
});

describe("belongsToProfile", () => {
  const doc = (docType: string, vendorProfileId: string | null, vehicleId: string | null = null) => ({
    doc_type: docType,
    vendor_profile_id: vendorProfileId,
    vehicle_id: vehicleId,
  });

  it("keeps the person's government ID and this business's own documents", () => {
    expect(belongsToProfile(doc("government_id", null), "A", [])).toBe(true);
    expect(belongsToProfile(doc("business_registration", "A"), "A", [])).toBe(true);
  });

  it("drops another business's documents of the same account", () => {
    expect(belongsToProfile(doc("business_registration", "B"), "A", [])).toBe(false);
  });

  it("keeps a vehicle document only for this profile's vehicles", () => {
    expect(belongsToProfile(doc("insurance", null, "v1"), "A", ["v1"])).toBe(true);
    expect(belongsToProfile(doc("insurance", null, "v2"), "A", ["v1"])).toBe(false);
  });
});
