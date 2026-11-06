import { describe, expect, it } from "vitest";

import {
  businessSchema,
  documentMetaSchema,
  transferRequestSchema,
  vehicleSchema,
} from "./vendor";

const VEHICLE_ID = "11111111-1111-4111-8111-111111111111";
const goodVehicle = {
  vehicleType: "SUV",
  make: "Toyota",
  model: "Noah",
  year: 2020,
  plate: "ab 1234",
  passengerCapacity: 7,
};

describe("businessSchema", () => {
  it("accepts an empty business name and a parish", () => {
    expect(businessSchema.safeParse({ businessName: "", primaryRegion: "St. Ann" }).success).toBe(true);
  });
  it("rejects an unknown region", () => {
    expect(businessSchema.safeParse({ primaryRegion: "Narnia" }).success).toBe(false);
  });
  it("rejects a name over 80 characters", () => {
    expect(
      businessSchema.safeParse({ businessName: "x".repeat(81), primaryRegion: "St. Ann" }).success,
    ).toBe(false);
  });
});

describe("vehicleSchema", () => {
  it("normalizes the plate", () => {
    const result = vehicleSchema.parse({ ...goodVehicle, plate: "ab 12" });
    expect(result.plate).toBe("AB12");
  });
  it("strips dashes so spellings match", () => {
    expect(vehicleSchema.parse({ ...goodVehicle, plate: "ab-12 34" }).plate).toBe("AB1234");
  });
  it("rejects years outside 1980 to next year", () => {
    const next = new Date().getFullYear() + 1;
    expect(vehicleSchema.safeParse({ ...goodVehicle, year: 1979 }).success).toBe(false);
    expect(vehicleSchema.safeParse({ ...goodVehicle, year: next + 1 }).success).toBe(false);
    expect(vehicleSchema.safeParse({ ...goodVehicle, year: next }).success).toBe(true);
  });
  it("rejects capacity 0 and 81", () => {
    expect(vehicleSchema.safeParse({ ...goodVehicle, passengerCapacity: 0 }).success).toBe(false);
    expect(vehicleSchema.safeParse({ ...goodVehicle, passengerCapacity: 81 }).success).toBe(false);
  });
  it("rejects an unknown vehicle type", () => {
    expect(vehicleSchema.safeParse({ ...goodVehicle, vehicleType: "Hovercraft" }).success).toBe(false);
  });
});

describe("documentMetaSchema", () => {
  const path = "acct/doc.png";
  it("needs a vehicle for insurance", () => {
    expect(
      documentMetaSchema.safeParse({ docType: "insurance", expiresOn: "2027-01-01", path }).success,
    ).toBe(false);
  });
  it("needs an expiry for insurance", () => {
    expect(
      documentMetaSchema.safeParse({ docType: "insurance", vehicleId: VEHICLE_ID, path }).success,
    ).toBe(false);
  });
  it("accepts a government ID without an expiry", () => {
    expect(documentMetaSchema.safeParse({ docType: "government_id", path }).success).toBe(true);
  });
  it("rejects a vehicle on a JTB license", () => {
    expect(
      documentMetaSchema.safeParse({
        docType: "jtb_license",
        vehicleId: VEHICLE_ID,
        expiresOn: "2027-01-01",
        path,
      }).success,
    ).toBe(false);
  });
});

describe("transferRequestSchema", () => {
  it("normalizes the plate", () => {
    expect(transferRequestSchema.parse({ plate: " ab 12 " }).plate).toBe("AB12");
  });
});
