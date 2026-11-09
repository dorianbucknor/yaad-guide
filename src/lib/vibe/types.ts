import type { Currency } from "@/lib/move/types";

export type { Currency };
export type VibeSubtype = "event" | "attraction" | "dining";
export type VenueType = "street_food" | "cookshop" | "restaurant";
export type BookingMode = "reservation" | "prepaid" | "listing_only";
export type ReservationStyle = "slotted" | "hours_only";
export type PriceTier = "$" | "$$" | "$$$";
export type VibeStatus = "draft" | "in_review" | "live";
export type CancellationPolicy = "flexible" | "moderate" | "strict";
export type SlotStatus = "open" | "closed";

export type TicketType = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discountPercent: number | null;
  maxPerBooking: number | null;
  sortOrder: number;
};

export type ScheduleRule = {
  id: string;
  weekday: number;
  startMinutes: number;
  capacity: number;
  validFrom: string | null;
  validUntil: string | null;
};

export type VibeSlot = {
  id: string;
  listingId: string;
  startsAt: string;
  capacity: number;
  booked: number;
  status: SlotStatus;
  source: "rule" | "one_off";
};

export type DiningProfile = {
  venueType: VenueType;
  dineIn: boolean;
  takeout: boolean;
  cuisineTypes: string[];
  priceTier: PriceTier | null;
  bookingMode: BookingMode;
  reservationStyle: ReservationStyle | null;
};

export type BusinessHoursRow = { id: string; weekday: number; opensMinutes: number; closesMinutes: number };

export type VibePhoto = { id: string; storagePath: string; isCover: boolean; position: number };

export type VibeListingView = {
  id: string;
  subtype: VibeSubtype;
  title: string;
  description: string | null;
  area: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  town: string | null;
  parish: string | null;
  latitude: number | null;
  longitude: number | null;
  currency: Currency;
  durationMinutes: number;
  bookingCutoffMinutes: number;
  autoGenerateSlots: boolean;
  cancellationPolicy: CancellationPolicy;
  status: VibeStatus;
  paused: boolean;
  reviewNote: string | null;
  tickets: TicketType[];
  rules: ScheduleRule[];
  photos: VibePhoto[];
  profileApproved: boolean;
  futureOpenSlotCount: number;
  /** The dining details; null for events and attractions, and for a dining listing that has none yet. */
  diningProfile: DiningProfile | null;
  businessHours: BusinessHoursRow[];
};

import type { VendorDocument, VendorProfile } from "@/lib/vendor/types";

export type VibeOverview = {
  userId: string;
  profile: VendorProfile | null;
  documents: VendorDocument[];
  hasGovernmentId: boolean;
};

export type VibeListingSummary = {
  id: string;
  title: string;
  subtype: VibeSubtype;
  status: VibeStatus;
  paused: boolean;
  nextSlotAt: string | null;
  openFlags: number;
};

export type UpcomingSlot = {
  id: string;
  listingId: string;
  listingTitle: string;
  startsAt: string;
  capacity: number;
  booked: number;
};
