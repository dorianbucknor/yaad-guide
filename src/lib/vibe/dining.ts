import type { BookingMode, ReservationStyle, VenueType } from "./types";

export const VENUE_TYPES = ["street_food", "cookshop", "restaurant"] as const satisfies readonly VenueType[];
export const BOOKING_MODES = ["reservation", "prepaid", "listing_only"] as const satisfies readonly BookingMode[];
export const RESERVATION_STYLES = ["slotted", "hours_only"] as const satisfies readonly ReservationStyle[];
export const PRICE_TIERS = ["$", "$$", "$$$"] as const;

export type DiningReadinessItem =
  | "profile_approved"
  | "basics"
  | "address"
  | "pin"
  | "cover_photo"
  | "venue_type"
  | "service_mode"
  | "tickets"
  | "slots"
  | "hours";

export type DiningReadinessInput = {
  profileApproved: boolean;
  description: string | null;
  area: string | null;
  addressLine1: string | null;
  town: string | null;
  parish: string | null;
  latitude: number | null;
  longitude: number | null;
  hasCoverPhoto: boolean;
  /** The dining details, or null when the vendor has not saved them yet. */
  profile: {
    venueType: VenueType;
    dineIn: boolean;
    takeout: boolean;
    bookingMode: BookingMode;
    reservationStyle: ReservationStyle | null;
    ticketCount: number;
    futureOpenSlotCount: number;
    ruleCount: number;
    autoGenerate: boolean;
    businessHoursCount: number;
  } | null;
};

const filled = (value: string | null): boolean => (value ?? "").trim() !== "";

/**
 * What a dining listing still needs before it can be submitted. Mirrors vibe_listing_is_ready in SQL,
 * plus `service_mode`, which the database enforces as a check but the form wants to explain.
 */
export function diningReadiness(input: DiningReadinessInput): { ready: boolean; missing: DiningReadinessItem[] } {
  const missing: DiningReadinessItem[] = [];
  if (!input.profileApproved) missing.push("profile_approved");
  if (!filled(input.description) || !filled(input.area)) missing.push("basics");
  if (!filled(input.addressLine1) || !filled(input.town) || !filled(input.parish)) missing.push("address");
  if (input.latitude === null || input.longitude === null) missing.push("pin");
  if (!input.hasCoverPhoto) missing.push("cover_photo");

  const p = input.profile;
  if (!p) {
    missing.push("venue_type");
    return { ready: false, missing };
  }
  if (p.venueType === "restaurant" && !p.dineIn && !p.takeout) missing.push("service_mode");

  const hasSlots = p.futureOpenSlotCount > 0 || (p.autoGenerate && p.ruleCount > 0);
  if (p.bookingMode === "prepaid") {
    if (p.ticketCount < 1) missing.push("tickets");
    if (!hasSlots) missing.push("slots");
  } else if (p.bookingMode === "reservation") {
    if (p.reservationStyle === "hours_only") {
      if (p.businessHoursCount < 1) missing.push("hours");
    } else if (!hasSlots) {
      missing.push("slots");
    }
  }
  return { ready: missing.length === 0, missing };
}
