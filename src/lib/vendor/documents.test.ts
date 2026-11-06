import { describe, expect, it } from "vitest";

import {
  documentPath,
  isExpired,
  isOwnDocumentPath,
  needsExpiry,
  needsVehicle,
  validateFile,
} from "./documents";

describe("document rules", () => {
  it("needs an expiry for every type but the government ID", () => {
    expect(needsExpiry("government_id")).toBe(false);
    expect(needsExpiry("jtb_license")).toBe(true);
    expect(needsExpiry("insurance")).toBe(true);
    expect(needsExpiry("fitness")).toBe(true);
  });

  it("ties insurance and fitness to a vehicle", () => {
    expect(needsVehicle("insurance")).toBe(true);
    expect(needsVehicle("fitness")).toBe(true);
    expect(needsVehicle("jtb_license")).toBe(false);
    expect(needsVehicle("government_id")).toBe(false);
  });

  it("rejects a wrong type or an oversize file and accepts a good one", () => {
    expect(validateFile({ type: "image/gif", size: 1 })).toEqual(expect.any(String));
    expect(validateFile({ type: "application/pdf", size: 5 * 1024 * 1024 + 1 })).toEqual(
      expect.any(String),
    );
    expect(validateFile({ type: "image/png", size: 1000 })).toBeNull();
  });

  it("treats a date before today as expired, today as valid", () => {
    expect(isExpired("2026-11-05", "2026-11-06")).toBe(true);
    expect(isExpired("2026-11-06", "2026-11-06")).toBe(false);
  });

  it("builds a path from account, document and mime type", () => {
    expect(documentPath("a1", "d1", "image/png")).toBe("a1/d1.png");
    expect(documentPath("a1", "d1", "application/pdf")).toBe("a1/d1.pdf");
    expect(documentPath("a1", "d1", "image/jpeg")).toBe("a1/d1.jpg");
  });

  it("accepts only a file directly inside the account's own folder", () => {
    expect(isOwnDocumentPath("a1/d1.png", "a1")).toBe(true);
    expect(isOwnDocumentPath("a2/d1.png", "a1")).toBe(false);
    expect(isOwnDocumentPath("a1/../a2/d1.png", "a1")).toBe(false);
    expect(isOwnDocumentPath("a1/x/d1.png", "a1")).toBe(false);
  });
});
