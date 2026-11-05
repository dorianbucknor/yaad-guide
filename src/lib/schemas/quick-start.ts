import { format } from "date-fns";
import { z } from "zod";

export const VEHICLES = ["sedan", "suv", "minivan", "wagon", "bus", "coach"] as const;
export type Vehicle = (typeof VEHICLES)[number];

export const VEHICLE_LABELS: Record<Vehicle, string> = {
  sedan: "Sedan",
  suv: "SUV",
  minivan: "Minivan",
  wagon: "Station Wagon/Hatchback",
  bus: "Bus",
  coach: "Coach",
};

const PLACES: readonly { place: string; parish: string }[] = [
  { place: "Kingston", parish: "Kingston" },
  { place: "Half Way Tree", parish: "St. Andrew" },
  { place: "Morant Bay", parish: "St. Thomas" },
  { place: "Port Antonio", parish: "Portland" },
  { place: "Port Maria", parish: "St. Mary" },
  { place: "Ocho Rios", parish: "St. Ann" },
  { place: "Falmouth", parish: "Trelawny" },
  { place: "Montego Bay", parish: "St. James" },
  { place: "Lucea", parish: "Hanover" },
  { place: "Negril", parish: "Westmoreland" },
  { place: "Treasure Beach", parish: "St. Elizabeth" },
  { place: "Mandeville", parish: "Manchester" },
  { place: "May Pen", parish: "Clarendon" },
  { place: "Spanish Town", parish: "St. Catherine" },
];

function kebab(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "-");
}

export const AREAS: readonly { id: string; place: string; parish: string }[] =
  PLACES.map((p) => ({ id: kebab(p.place), ...p }));

export function areaLabel(id: string): string {
  const area = AREAS.find((a) => a.id === id);
  if (!area) return id;
  return area.parish === area.place ? area.place : `${area.place} (${area.parish})`;
}

export const INTERESTS: readonly { id: string; label: string }[] = [
  "River",
  "Beach",
  "ATV",
  "Jerk Chicken",
  "Gardens",
  "Rafting",
  "Cuisine",
  "Parties",
  "Camping",
  "Zipline",
  "Horseback Riding",
  "Snorkeling",
  "Nature and Wildlife",
  "Historical Sites",
  "Boat Rides",
  "Natural Pools",
  "KFC",
].map((label) => ({
  id: kebab(label.replace(/ and /, " ")),
  label,
}));

const interestIds = new Set(INTERESTS.map((i) => i.id));
const areaIds = new Set(AREAS.map((a) => a.id));

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time");

export const quickStartShape = z.object({
  move: z
    .object({
      kind: z.enum(["taxi", "driver"]),
      passengers: z.number().int().min(1).max(50),
      vehicle: z.enum(VEHICLES),
      pickupDate: dateString,
      pickupTime: timeString,
    })
    .optional(),
  stay: z
    .object({
      type: z.enum(["hotel", "villa"]),
      area: z.string().refine((v) => areaIds.has(v), "Choose an area"),
      rooms: z.number().int().min(1).max(20),
      adults: z.number().int().min(1).max(50),
      children: z.number().int().min(0).max(50),
      checkIn: dateString,
      checkOut: dateString,
    })
    .optional(),
  interests: z
    .array(z.string().refine((v) => interestIds.has(v), "Unknown interest"))
    .default([]),
});

export type QuickStartDraft = z.infer<typeof quickStartShape>;

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function tripStartDate(draft: QuickStartDraft): string | undefined {
  const dates = [draft.move?.pickupDate, draft.stay?.checkIn].filter(
    (d): d is string => d !== undefined,
  );
  if (dates.length === 0) return undefined;
  return dates.reduce((min, d) => (d < min ? d : min));
}

const PAST_MESSAGE = "Pick a date from today onwards";

export const quickStartSchema = quickStartShape.superRefine((draft, ctx) => {
  if (!draft.move && !draft.stay && draft.interests.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: [],
      message: "Choose at least one of getting around, where you'll stay or things to do",
    });
  }
  const today = todayISO();
  if (draft.move && draft.move.pickupDate < today) {
    ctx.addIssue({ code: "custom", path: ["move", "pickupDate"], message: PAST_MESSAGE });
  }
  if (draft.stay) {
    if (draft.stay.checkIn < today) {
      ctx.addIssue({ code: "custom", path: ["stay", "checkIn"], message: PAST_MESSAGE });
    }
    if (draft.stay.checkOut <= draft.stay.checkIn) {
      ctx.addIssue({
        code: "custom",
        path: ["stay", "checkOut"],
        message: "Check-out must be after check-in",
      });
    }
  }
});
