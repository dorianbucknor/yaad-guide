import { describe, expect, it } from "vitest";

import { checkReadiness, type ReadinessInput } from "./readiness";

const today = "2026-11-06";
const ok: ReadinessInput = {
  today,
  vehicles: [{ id: "v1", isActive: true }],
  documents: [
    { docType: "government_id", vehicleId: null, expiresOn: null },
    { docType: "jtb_license", vehicleId: null, expiresOn: "2027-01-01" },
    { docType: "insurance", vehicleId: "v1", expiresOn: "2027-01-01" },
    { docType: "fitness", vehicleId: "v1", expiresOn: "2027-01-01" },
  ],
};

const without = (docType: string, vehicleId: string | null = null): ReadinessInput => ({
  ...ok,
  documents: ok.documents.filter((d) => !(d.docType === docType && d.vehicleId === vehicleId)),
});

describe("checkReadiness", () => {
  it("is ready with ID, license and a certified active vehicle", () => {
    expect(checkReadiness(ok)).toEqual({ ready: true, missing: [] });
  });

  it.each([
    ["no government ID", without("government_id")],
    ["no JTB license", without("jtb_license")],
    [
      "an expired JTB license",
      {
        ...ok,
        documents: ok.documents.map((d) =>
          d.docType === "jtb_license" ? { ...d, expiresOn: "2026-11-05" } : d,
        ),
      },
    ],
    ["no vehicle", { ...ok, vehicles: [], documents: ok.documents.slice(0, 2) }],
    ["no active vehicle", { ...ok, vehicles: [{ id: "v1", isActive: false }] }],
    ["no insurance", without("insurance", "v1")],
    ["no fitness certificate", without("fitness", "v1")],
    [
      "an expired fitness certificate",
      {
        ...ok,
        documents: ok.documents.map((d) =>
          d.docType === "fitness" ? { ...d, expiresOn: "2026-01-01" } : d,
        ),
      },
    ],
    [
      "a second vehicle without certificates",
      { ...ok, vehicles: [...ok.vehicles, { id: "v2", isActive: false }] },
    ],
  ] as [string, ReadinessInput][])("is not ready with %s", (_label, input) => {
    const result = checkReadiness(input);
    expect(result.ready).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it("names a distinct item for each gap", () => {
    const labels = [
      without("government_id"),
      without("jtb_license"),
      without("insurance", "v1"),
      without("fitness", "v1"),
    ].map((i) => checkReadiness(i).missing.join("|"));
    expect(new Set(labels).size).toBe(4);
  });
});
