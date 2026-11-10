import { z } from "zod";

import { VIBE_CONFIG } from "@/lib/vibe/config";

export const CURRENCIES = ["usd", "jmd"] as const;
export const SUBTYPES = ["event", "attraction", "dining"] as const;
export const POLICIES = ["flexible", "moderate", "strict"] as const;
export const PARISHES = [
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

/** Optional text: trimmed, and an empty value becomes null. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .max(max, message)
    .nullable()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    });

const money = z
  .number({ error: "Enter the price." })
  .min(0, "The price can't be negative.")
  .max(1_000_000, "That price is too high.");

export const vibeBasicsSchema = z.object({
  subtype: z.enum(SUBTYPES, { error: "Choose event or attraction." }),
  title: z.string().trim().min(3, "Enter a title of at least 3 characters.").max(100, "Keep the title under 100 characters."),
  description: optionalText(1000, "Keep the description under 1000 characters."),
  area: optionalText(100, "Keep the area under 100 characters."),
  currency: z.enum(CURRENCIES, { error: "Choose USD or JMD." }),
  durationMinutes: z
    .number({ error: "Enter how long it lasts." })
    .int("Use whole minutes.")
    .min(15, "It must last at least 15 minutes.")
    .max(1440, "It can last at most 24 hours."),
  bookingCutoffMinutes: z
    .number({ error: "Enter the booking cutoff." })
    .int("Use whole minutes.")
    .min(0, "The cutoff can't be negative.")
    .max(VIBE_CONFIG.maxCutoffMinutes, "The cutoff can be at most 7 days.")
    .default(VIBE_CONFIG.defaultCutoffMinutes),
  cancellationPolicy: z.enum(POLICIES, { error: "Choose a cancellation policy." }).default("flexible"),
});
export type VibeBasicsInput = z.input<typeof vibeBasicsSchema>;

export const policySchema = z.object({
  cancellationPolicy: z.enum(POLICIES, { error: "Choose a cancellation policy." }),
});

export const addressSchema = z.object({
  addressLine1: z.string().trim().min(1, "Enter the street address.").max(150, "That is too long."),
  addressLine2: optionalText(150, "That is too long."),
  town: z.string().trim().min(1, "Enter the town.").max(100, "That is too long."),
  parish: z.enum(PARISHES, { error: "Choose a parish." }),
  latitude: z.number({ error: "Set the pin on the map." }).min(17.5, "The pin must be in Jamaica.").max(18.7, "The pin must be in Jamaica."),
  longitude: z.number({ error: "Set the pin on the map." }).min(-78.6, "The pin must be in Jamaica.").max(-76.0, "The pin must be in Jamaica."),
});
export type AddressInput = z.input<typeof addressSchema>;

/** The ticket fields alone; the form checks these, then asks for the free-ticket confirmation. */
export const ticketFieldsSchema = z.object({
    id: z.uuid().nullable().optional(),
    name: z.string().trim().min(1, "Name the ticket.").max(80, "Keep the name under 80 characters."),
    description: optionalText(
      VIBE_CONFIG.ticketDescriptionMax,
      `Keep the description under ${VIBE_CONFIG.ticketDescriptionMax} characters.`,
    ),
    price: money,
    discountPercent: z
      .number({ error: "Enter a percentage." })
      .gt(0, "A discount must be above 0%.")
      .lt(100, "A discount must be below 100%.")
      .nullable()
      .optional()
      .transform((value) => value ?? null),
    maxPerBooking: z
      .number()
      .int("Use a whole number.")
      .min(1, "The limit must be at least 1.")
      .max(100, "The limit can be at most 100.")
      .nullable()
      .optional()
      .transform((value) => value ?? null),
    confirmFree: z.boolean().default(false),
});

export const ticketTypeSchema = ticketFieldsSchema
  .refine((ticket) => ticket.price > 0 || ticket.confirmFree, {
    message: "Confirm that this ticket is free.",
    path: ["confirmFree"],
  })
  .refine((ticket) => ticket.price > 0 || ticket.discountPercent === null, {
    message: "A free ticket can't have a discount.",
    path: ["discountPercent"],
  });
export type TicketTypeInput = z.input<typeof ticketTypeSchema>;
export type TicketFieldsInput = z.input<typeof ticketFieldsSchema>;
export type TicketFieldsOutput = z.output<typeof ticketFieldsSchema>;

export const scheduleRuleSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startMinutes: z.number().int().min(0, "Choose a start time.").max(1439, "Choose a start time."),
    capacity: z.number({ error: "Enter the capacity." }).int("Use a whole number.").min(1, "Capacity must be at least 1.").max(100_000, "That is too many."),
    validFrom: z.iso.date().nullable().optional().transform((value) => value ?? null),
    validUntil: z.iso.date().nullable().optional().transform((value) => value ?? null),
  })
  .refine((rule) => !rule.validFrom || !rule.validUntil || rule.validFrom <= rule.validUntil, {
    message: "The end date must be on or after the start date.",
    path: ["validUntil"],
  });

export const scheduleSchema = z.object({
  autoGenerate: z.boolean(),
  rules: z.array(scheduleRuleSchema).max(42, "That is too many weekly times."),
});
export type ScheduleInput = z.input<typeof scheduleSchema>;

export const manualSlotSchema = z.object({
  startsAt: z.iso
    .datetime({ error: "Choose a date and time." })
    .refine((value) => new Date(value).getTime() > Date.now(), { message: "Choose a time in the future." }),
  capacity: z.number({ error: "Enter the capacity." }).int("Use a whole number.").min(1, "Capacity must be at least 1.").max(100_000, "That is too many."),
});

export const slotEditSchema = z.object({
  id: z.uuid(),
  capacity: z.number({ error: "Enter the capacity." }).int("Use a whole number.").min(1, "Capacity must be at least 1.").max(100_000, "That is too many."),
  status: z.enum(["open", "closed"], { error: "Choose open or closed." }),
});

export const closeDateSchema = z.object({
  day: z.iso.date({ error: "Choose a date." }),
  closed: z.boolean(),
});

export const closeRangeSchema = z.object({
  from: z.iso.date({ error: "Choose a first day." }),
  to: z.iso.date({ error: "Choose a last day." }),
  closed: z.boolean(),
});

export const vibePhotoSchema = z.object({
  listingId: z.uuid(),
  path: z.string().min(1),
});

export const vibeBusinessSchema = z.object({
  businessName: optionalText(100, "Keep the business name under 100 characters."),
  primaryRegion: z.string().trim().min(1, "Enter your region.").max(100, "That is too long."),
});

export type VibeBusinessInput = z.input<typeof vibeBusinessSchema>;
export type VibeBusinessOutput = z.output<typeof vibeBusinessSchema>;

/** A listing photo sits at `<user id>/vibe/<listing id>/<file>.(jpg|jpeg|png|webp)`. */
export function isOwnVibePhotoPath(path: string, userId: string, listingId: string): boolean {
  if (path.includes("..")) return false;
  const parts = path.split("/");
  return (
    parts.length === 4 &&
    parts[0] === userId &&
    parts[1] === "vibe" &&
    parts[2] === listingId &&
    /^[A-Za-z0-9._-]+\.(jpe?g|png|webp)$/i.test(parts[3])
  );
}
