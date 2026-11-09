import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";

import type { BookingMode, Currency, ReservationStyle, VenueType, VibeSubtype } from "./types";

export type ReviewVibeListing = {
  id: string;
  title: string;
  subtype: VibeSubtype;
  businessName: string;
  ownerName: string;
  region: string;
  area: string | null;
  address: string;
  currency: Currency;
  description: string | null;
  tickets: { name: string; price: number; discountPercent: number | null }[];
  weeklyTimes: number;
  photoCount: number;
  submittedAt: string;
  /** The dining details; null for events and attractions. */
  dining: { venueType: VenueType; bookingMode: BookingMode; reservationStyle: ReservationStyle | null; hoursDays: number } | null;
};

export type OpenVibeFlag = { id: string; kind: string; createdAt: string; listingId: string; title: string; businessName: string };

type Profile = { account_id: string; business_name: string | null; primary_region: string };
const one = <T>(value: T | T[] | null | undefined): T | undefined => (Array.isArray(value) ? value[0] : (value ?? undefined));

/** First Vibe listings waiting for an admin, and changes to check on live ones. Null when the caller is not a reviewer. */
export async function getVibeListingQueue(): Promise<{ listings: ReviewVibeListing[]; flags: OpenVibeFlag[] } | null> {
  await connection();
  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("authorize", { p_permission: "listings.review" });
  if (allowed !== true) return null;

  const { data: waiting } = await supabase
    .from("vibe_listings")
    .select(
      "id, title, subtype, area, address_line1, address_line2, town, parish, currency, description, updated_at, vendor_profiles(account_id, business_name, primary_region), vibe_ticket_types(name, price, discount_percent, sort_order), vibe_schedule_rules(id), vibe_photos(id), vibe_dining_profiles(venue_type, booking_mode, reservation_style), vibe_business_hours(id)",
    )
    .eq("status", "in_review")
    .order("updated_at");

  const ownerIds = (waiting ?? []).map((l) => one(l.vendor_profiles as Profile | Profile[] | null)?.account_id).filter((v): v is string => Boolean(v));
  const { data: owners } = ownerIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", ownerIds)
    : { data: [] };

  const listings: ReviewVibeListing[] = (waiting ?? []).map((l) => {
    const vp = one(l.vendor_profiles as Profile | Profile[] | null);
    const owner = owners?.find((o) => o.id === vp?.account_id);
    const ownerName = owner ? `${owner.first_name} ${owner.last_name}`.trim() : "";
    const tickets = ((l.vibe_ticket_types as { name: string; price: number | string; discount_percent: number | string | null; sort_order: number }[] | null) ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((t) => ({ name: t.name, price: Number(t.price), discountPercent: t.discount_percent === null ? null : Number(t.discount_percent) }));
    const diningRow = one(
      l.vibe_dining_profiles as
        | { venue_type: VenueType; booking_mode: BookingMode; reservation_style: ReservationStyle | null }
        | { venue_type: VenueType; booking_mode: BookingMode; reservation_style: ReservationStyle | null }[]
        | null,
    );
    return {
      id: l.id as string,
      title: l.title as string,
      subtype: l.subtype as VibeSubtype,
      businessName: vp?.business_name || ownerName || "Unnamed",
      ownerName: ownerName || "Unnamed",
      region: vp?.primary_region ?? "",
      area: l.area as string | null,
      address: [l.address_line1, l.address_line2, l.town, l.parish].filter(Boolean).join(", "),
      currency: l.currency as Currency,
      description: l.description as string | null,
      tickets,
      weeklyTimes: (l.vibe_schedule_rules as unknown[] | null)?.length ?? 0,
      photoCount: (l.vibe_photos as unknown[] | null)?.length ?? 0,
      submittedAt: l.updated_at as string,
      dining: diningRow
        ? {
            venueType: diningRow.venue_type,
            bookingMode: diningRow.booking_mode,
            reservationStyle: diningRow.reservation_style,
            hoursDays: (l.vibe_business_hours as unknown[] | null)?.length ?? 0,
          }
        : null,
    };
  });

  const { data: flags } = await supabase
    .from("vibe_listing_flags")
    .select("id, kind, created_at, listing_id, vibe_listings(title, vendor_profiles(business_name))")
    .is("resolved_at", null)
    .order("created_at");

  return {
    listings,
    flags: (flags ?? []).map((f) => {
      const listing = one(f.vibe_listings as { title: string; vendor_profiles: unknown } | { title: string; vendor_profiles: unknown }[] | null);
      const vp = one(listing?.vendor_profiles as { business_name: string | null } | { business_name: string | null }[] | null);
      return {
        id: f.id as string,
        kind: f.kind as string,
        createdAt: f.created_at as string,
        listingId: f.listing_id as string,
        title: listing?.title ?? "A listing",
        businessName: vp?.business_name || "A vendor",
      };
    }),
  };
}
