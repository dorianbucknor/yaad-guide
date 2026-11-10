import { z } from "zod";

export const CURRENCIES = ["usd", "jmd"] as const;
export const PHOTO_KINDS = ["front", "rear", "interior", "luggage", "extra"] as const;
export const DECLINE_REASONS = ["dates_blocked", "too_far", "vehicle_unavailable", "other"] as const;

const money = (label: string) =>
  z
    .number({ error: `Enter the ${label}.` })
    .min(0, `The ${label} can't be negative.`)
    .max(1_000_000, `That ${label} is too high.`);

/** A price field that may be left empty. */
const optionalMoney = (label: string) => money(label).nullable();

export const listingSchema = z.object({
  currency: z.enum(CURRENCIES, { error: "Choose USD or JMD." }),
  islandWide: z.boolean(),
  distancePricingEnabled: z.boolean().default(true),
  baseFare: optionalMoney("base fare"),
  perKm: optionalMoney("price per km"),
  hourlyRate: optionalMoney("hourly rate"),
  cancellationPolicy: z.enum(["flexible", "moderate"], { error: "Choose a cancellation policy." }).default("flexible"),
  description: z
    .string()
    .max(500, "Keep the description under 500 characters.")
    .nullable()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    }),
});
export type ListingInput = z.input<typeof listingSchema>;

export const flatRateSchema = z
  .object({
    placeAId: z.uuid("Choose a place."),
    placeBId: z.uuid("Choose a place."),
    price: money("price").refine((value) => value > 0, "Enter a price above zero."),
  })
  .refine((rate) => rate.placeAId !== rate.placeBId, {
    message: "Choose two different places.",
    path: ["placeBId"],
  });

export const coverageSchema = z.object({
  placeIds: z.array(z.uuid()).max(200),
});

const windowSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startMinutes: z.number().int().min(0).max(1439),
    endMinutes: z.number().int().min(1).max(1440),
  })
  .refine((window) => window.endMinutes > window.startMinutes, {
    message: "A window must end after it starts.",
    path: ["endMinutes"],
  });

export const availabilitySchema = z.object({
  windows: z.array(windowSchema).max(42, "That is too many windows."),
});

export const blockedRangeSchema = z
  .object({
    startsAt: z.iso.datetime({ error: "Choose a start." }),
    endsAt: z.iso.datetime({ error: "Choose an end." }),
    note: z.string().max(200).nullable().optional(),
  })
  .refine((range) => new Date(range.endsAt) > new Date(range.startsAt), {
    message: "The end must be after the start.",
    path: ["endsAt"],
  });

export const unblockRangeSchema = z
  .object({ startsAt: z.iso.datetime(), endsAt: z.iso.datetime() })
  .refine((range) => new Date(range.endsAt) > new Date(range.startsAt), {
    message: "The end must be after the start.",
    path: ["endsAt"],
  });

export const luggageSchema = z.object({
  vehicleId: z.uuid(),
  large: z.number().int().min(0, "Enter 0 or more.").max(20, "The most is 20."),
  carryOn: z.number().int().min(0, "Enter 0 or more.").max(20, "The most is 20."),
});

export const photoSchema = z.object({
  vehicleId: z.uuid(),
  kind: z.enum(PHOTO_KINDS),
  path: z.string().min(1),
});

export const placeSuggestionSchema = z.object({
  name: z.string().trim().min(2, "Enter the place name.").max(80, "That name is too long."),
  note: z.string().trim().max(300, "Keep the note under 300 characters.").optional(),
});

export const acceptRequestSchema = z.object({
  id: z.uuid(),
  note: z.string().trim().max(300, "Keep the note under 300 characters.").optional(),
});

export const declineRequestSchema = z.object({
  id: z.uuid(),
  reason: z.enum(DECLINE_REASONS, { error: "Choose a reason." }),
});

/** A listing photo sits at `<user id>/<vehicle id>/<file>.(jpg|jpeg|png|webp)`. */
export function isOwnPhotoPath(path: string, userId: string, vehicleId: string): boolean {
  if (path.includes("..")) return false;
  const parts = path.split("/");
  return (
    parts.length === 3 &&
    parts[0] === userId &&
    parts[1] === vehicleId &&
    /^[A-Za-z0-9._-]+\.(jpe?g|png|webp)$/i.test(parts[2])
  );
}

export const PLACE_KINDS = ["airport", "city", "town", "resort_area"] as const;

export const placeSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Enter the place name.").max(80, "That name is too long."),
  kind: z.enum(PLACE_KINDS, { error: "Choose a kind." }),
  parish: z.string().trim().min(2, "Enter the parish.").max(40, "That name is too long."),
  lat: z.number({ error: "Enter the latitude." }).min(17.5, "That is outside Jamaica.").max(18.7, "That is outside Jamaica."),
  lng: z.number({ error: "Enter the longitude." }).min(-78.5, "That is outside Jamaica.").max(-76, "That is outside Jamaica."),
  active: z.boolean(),
});

export const suggestionResolveSchema = z.object({
  id: z.uuid(),
  status: z.enum(["added", "dismissed"], { error: "Choose added or dismissed." }),
});

export const listingReviewSchema = z
  .object({
    listingId: z.uuid(),
    decision: z.enum(["approve", "reject"], { error: "Choose approve or reject." }),
    note: z.string().trim().max(500, "Keep the note under 500 characters.").optional(),
  })
  .refine((review) => review.decision === "approve" || Boolean(review.note), {
    message: "Add a note explaining what to fix.",
    path: ["note"],
  });
