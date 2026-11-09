import { z } from "zod";

import { BOOKING_MODES, PRICE_TIERS, RESERVATION_STYLES, VENUE_TYPES } from "@/lib/vibe/dining";

export const CUISINE_MAX = 10;
const CUISINE_LENGTH = 40;

/** Trims each entry, drops blanks, and drops repeats whatever their case, keeping the first spelling. */
function cleanCuisines(entries: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of entries) {
    const name = entry.trim();
    const key = name.toLowerCase();
    if (name === "" || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

export const diningDetailsSchema = z
  .object({
    venueType: z.enum(VENUE_TYPES, { error: "Choose street food, cookshop or restaurant." }),
    dineIn: z.boolean().default(false),
    takeout: z.boolean().default(false),
    cuisineTypes: z
      .array(z.string().max(CUISINE_LENGTH, `Keep each cuisine under ${CUISINE_LENGTH} characters.`))
      .default([])
      .transform(cleanCuisines)
      .refine((names) => names.length <= CUISINE_MAX, { message: `Choose up to ${CUISINE_MAX} cuisines.` }),
    priceTier: z
      .enum(PRICE_TIERS, { error: "Choose $, $$ or $$$." })
      .nullable()
      .default(null),
    bookingMode: z.enum(BOOKING_MODES, { error: "Choose how travelers will book." }),
    reservationStyle: z
      .enum(RESERVATION_STYLES, { error: "Choose slots or opening hours." })
      .nullable()
      .default(null),
  })
  .refine((details) => details.venueType !== "restaurant" || details.dineIn || details.takeout, {
    message: "A restaurant needs dine-in, takeout, or both.",
    path: ["dineIn"],
  })
  .refine((details) => (details.bookingMode === "reservation") === (details.reservationStyle !== null), {
    message: "Choose slots or opening hours for a reservation listing, and nothing for the other modes.",
    path: ["reservationStyle"],
  });
export type DiningDetailsInput = z.input<typeof diningDetailsSchema>;
export type DiningDetailsOutput = z.output<typeof diningDetailsSchema>;

export const businessHoursRowSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    opensMinutes: z.number({ error: "Choose an opening time." }).int().min(0, "Choose an opening time.").max(1439, "Choose an opening time."),
    closesMinutes: z.number({ error: "Choose a closing time." }).int().min(0, "Choose a closing time.").max(1439, "Choose a closing time."),
  })
  .refine((row) => row.closesMinutes > row.opensMinutes, {
    message: "Closing time must be after opening time. Hours can't run past midnight; enter the late hours as the next day's.",
    path: ["closesMinutes"],
  });

export const businessHoursSetSchema = z
  .array(businessHoursRowSchema)
  .max(7, "A week has seven days.")
  .refine((rows) => new Set(rows.map((row) => row.weekday)).size === rows.length, {
    message: "Each day can have only one set of hours.",
  });
export type BusinessHoursSetInput = z.input<typeof businessHoursSetSchema>;
