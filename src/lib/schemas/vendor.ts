import { z } from "zod";

import { DOC_TYPES, needsExpiry, needsVehicle } from "@/lib/vendor/documents";
import { normalizePlate } from "@/lib/vendor/plate";

export const JAMAICA_PARISHES = [
  "Kingston",
  "St. Andrew",
  "St. Thomas",
  "Portland",
  "St. Mary",
  "St. Ann",
  "Trelawny",
  "St. James",
  "Hanover",
  "Westmoreland",
  "St. Elizabeth",
  "Manchester",
  "Clarendon",
  "St. Catherine",
] as const;

export const VEHICLE_TYPES = [
  "Sedan",
  "SUV",
  "Minivan",
  "Station Wagon/Hatchback",
  "Bus",
  "Coach",
] as const;

const REQUIRED = "This field is required.";

const plateSchema = z
  .string()
  .transform(normalizePlate)
  .pipe(
    z
      .string()
      .min(2, "Enter the plate number.")
      .max(10, "A plate is 10 characters or fewer.")
      .regex(/^[A-Z0-9-]+$/, "Use letters, numbers and dashes only."),
  );

export const businessSchema = z.object({
  businessName: z.string().trim().max(80, "Must be 80 characters or fewer.").optional(),
  primaryRegion: z.enum(JAMAICA_PARISHES, { error: "Choose your primary region." }),
});

export const vehicleSchema = z.object({
  vehicleType: z.enum(VEHICLE_TYPES, { error: "Choose a vehicle type." }),
  make: z.string().trim().min(1, REQUIRED).max(40, "Must be 40 characters or fewer."),
  model: z.string().trim().min(1, REQUIRED).max(40, "Must be 40 characters or fewer."),
  year: z.coerce
    .number({ error: "Enter the year." })
    .int("Enter a whole year.")
    .min(1980, "The year must be 1980 or later.")
    .superRefine((year, ctx) => {
      if (year > new Date().getFullYear() + 1) {
        ctx.addIssue({ code: "custom", message: "That year is in the future." });
      }
    }),
  plate: plateSchema,
  passengerCapacity: z.coerce
    .number({ error: "Enter the passenger capacity." })
    .int("Enter a whole number.")
    .min(1, "At least 1 passenger.")
    .max(80, "At most 80 passengers."),
});

export const documentMetaSchema = z
  .object({
    docType: z.enum(DOC_TYPES),
    vehicleId: z.uuid().optional(),
    expiresOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the expiry date.")
      .optional(),
    path: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    if (needsExpiry(value.docType) && !value.expiresOn) {
      ctx.addIssue({ code: "custom", path: ["expiresOn"], message: "Enter the expiry date." });
    }
    if (needsVehicle(value.docType) && !value.vehicleId) {
      ctx.addIssue({ code: "custom", path: ["vehicleId"], message: "Choose the vehicle." });
    }
    if (!needsVehicle(value.docType) && value.vehicleId) {
      ctx.addIssue({
        code: "custom",
        path: ["vehicleId"],
        message: "This document does not belong to a vehicle.",
      });
    }
  });

export const transferRequestSchema = z.object({ plate: plateSchema });

export type BusinessInput = z.input<typeof businessSchema>;
export type VehicleInput = z.input<typeof vehicleSchema>;
export type DocumentMetaInput = z.input<typeof documentMetaSchema>;
