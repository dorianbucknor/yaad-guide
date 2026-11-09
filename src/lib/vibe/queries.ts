import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { DocType } from "@/lib/vendor/documents";
import type { VendorStatus } from "@/lib/vendor/types";

import type {
  VibeListingSummary,
  VibeListingView,
  VibeOverview,
  VibeSlot,
  VibeStatus,
  VibeSubtype,
  CancellationPolicy,
  Currency,
  UpcomingSlot,
} from "./types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function currentUserId(supabase: Supabase): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function vibeProfile(supabase: Supabase, userId: string) {
  const { data } = await supabase
    .from("vendor_profiles")
    .select("id, business_name, primary_region, status, review_note, submitted_at")
    .eq("account_id", userId)
    .eq("category", "vibe")
    .maybeSingle();
  return data;
}

/** The signed-in vendor's Vibe profile and documents. Dynamic. */
export async function getVibeOverview(): Promise<VibeOverview | null> {
  await connection();
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return null;

  const profile = await vibeProfile(supabase, userId);
  const { data: docs } = await supabase
    .from("vendor_documents")
    .select("id, doc_type, vehicle_id, expires_on, verified, storage_path")
    .in("doc_type", ["government_id", "business_registration", "venue_permit"]);

  const documents = (docs ?? []).map((d) => ({
    id: d.id as string,
    docType: d.doc_type as DocType,
    vehicleId: null,
    expiresOn: (d.expires_on as string | null) ?? null,
    verified: Boolean(d.verified),
    storagePath: d.storage_path as string,
  }));

  return {
    userId,
    profile: profile
      ? {
          id: profile.id,
          businessName: profile.business_name,
          primaryRegion: profile.primary_region,
          status: profile.status as VendorStatus,
          reviewNote: profile.review_note,
          submittedAt: profile.submitted_at,
        }
      : null,
    documents,
    hasGovernmentId: documents.some((d) => d.docType === "government_id"),
  };
}

/** The vendor's listings with their next open slot. Dynamic. */
export async function getMyVibeListings(): Promise<VibeListingSummary[]> {
  await connection();
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return [];
  const profile = await vibeProfile(supabase, userId);
  if (!profile) return [];

  const { data: listings } = await supabase
    .from("vibe_listings")
    .select("id, title, subtype, status, paused")
    .eq("vendor_profile_id", profile.id)
    .order("created_at", { ascending: false });
  if (!listings || listings.length === 0) return [];
  const ids = listings.map((l) => l.id as string);

  const [{ data: slots }, { data: flags }] = await Promise.all([
    supabase
      .from("vibe_slots")
      .select("listing_id, starts_at")
      .in("listing_id", ids)
      .eq("status", "open")
      .gt("starts_at", new Date().toISOString())
      .order("starts_at"),
    supabase.from("vibe_listing_flags").select("listing_id").in("listing_id", ids).is("resolved_at", null),
  ]);

  const next = new Map<string, string>();
  for (const slot of slots ?? []) {
    if (!next.has(slot.listing_id as string)) next.set(slot.listing_id as string, slot.starts_at as string);
  }

  return listings.map((l) => ({
    id: l.id as string,
    title: l.title as string,
    subtype: l.subtype as VibeSubtype,
    status: l.status as VibeStatus,
    paused: Boolean(l.paused),
    nextSlotAt: next.get(l.id as string) ?? null,
    openFlags: (flags ?? []).filter((f) => f.listing_id === l.id).length,
  }));
}

/** One listing with its tickets, weekly rules and photos; null when it is not the caller's. Dynamic. */
export async function getVibeListing(id: string): Promise<VibeListingView | null> {
  await connection();
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return null;

  const { data: l } = await supabase
    .from("vibe_listings")
    .select(
      "id, vendor_profile_id, subtype, title, description, area, address_line1, address_line2, town, parish, latitude, longitude, currency, duration_minutes, booking_cutoff_minutes, auto_generate_slots, cancellation_policy, status, paused, review_note",
    )
    .eq("id", id)
    .maybeSingle();
  if (!l) return null;

  const [{ data: profile }, { data: tickets }, { data: rules }, { data: photos }, { count }] = await Promise.all([
    supabase.from("vendor_profiles").select("status").eq("id", l.vendor_profile_id).maybeSingle(),
    supabase
      .from("vibe_ticket_types")
      .select("id, name, description, price, discount_percent, max_per_booking, sort_order")
      .eq("listing_id", id)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("vibe_schedule_rules")
      .select("id, weekday, start_minutes, capacity, valid_from, valid_until")
      .eq("listing_id", id)
      .order("weekday")
      .order("start_minutes"),
    supabase.from("vibe_photos").select("id, storage_path, is_cover, position").eq("listing_id", id).order("position"),
    supabase
      .from("vibe_slots")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", id)
      .eq("status", "open")
      .gt("starts_at", new Date().toISOString()),
  ]);

  return {
    id: l.id,
    subtype: l.subtype as VibeSubtype,
    title: l.title,
    description: l.description,
    area: l.area,
    addressLine1: l.address_line1,
    addressLine2: l.address_line2,
    town: l.town,
    parish: l.parish,
    latitude: l.latitude === null ? null : Number(l.latitude),
    longitude: l.longitude === null ? null : Number(l.longitude),
    currency: l.currency as Currency,
    durationMinutes: l.duration_minutes,
    bookingCutoffMinutes: l.booking_cutoff_minutes,
    autoGenerateSlots: l.auto_generate_slots,
    cancellationPolicy: l.cancellation_policy as CancellationPolicy,
    status: l.status as VibeStatus,
    paused: l.paused,
    reviewNote: l.review_note,
    tickets: (tickets ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      price: Number(t.price),
      discountPercent: t.discount_percent === null ? null : Number(t.discount_percent),
      maxPerBooking: t.max_per_booking,
      sortOrder: t.sort_order,
    })),
    rules: (rules ?? []).map((r) => ({
      id: r.id,
      weekday: r.weekday,
      startMinutes: r.start_minutes,
      capacity: r.capacity,
      validFrom: r.valid_from,
      validUntil: r.valid_until,
    })),
    photos: (photos ?? []).map((p) => ({
      id: p.id,
      storagePath: p.storage_path,
      isCover: p.is_cover,
      position: p.position,
    })),
    profileApproved: profile?.status === "approved",
    futureOpenSlotCount: count ?? 0,
    // Filled in for dining listings by a later change.
    diningProfile: null,
    businessHours: [],
  };
}

/** Slots between two Jamaica days (`YYYY-MM-DD`, to is exclusive), earliest first. Dynamic. */
export async function getVibeSlots(listingId: string, fromDay: string, toDay: string): Promise<VibeSlot[]> {
  await connection();
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return [];

  // Jamaica is UTC-5 all year, so a local midnight is 05:00 UTC.
  const from = new Date(`${fromDay}T05:00:00Z`).toISOString();
  const to = new Date(`${toDay}T05:00:00Z`).toISOString();
  const { data } = await supabase
    .from("vibe_slots")
    .select("id, listing_id, starts_at, capacity, booked, status, source")
    .eq("listing_id", listingId)
    .gte("starts_at", from)
    .lt("starts_at", to)
    .order("starts_at");

  return (data ?? []).map((s) => ({
    id: s.id,
    listingId: s.listing_id,
    startsAt: s.starts_at,
    capacity: s.capacity,
    booked: s.booked,
    status: s.status,
    source: s.source,
  }));
}

/** The next open slots across all of the vendor's listings, earliest first. Dynamic. */
export async function getUpcomingVibeSlots(limit = 8): Promise<UpcomingSlot[]> {
  await connection();
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return [];
  const profile = await vibeProfile(supabase, userId);
  if (!profile) return [];

  const { data: listings } = await supabase.from("vibe_listings").select("id, title").eq("vendor_profile_id", profile.id);
  if (!listings || listings.length === 0) return [];
  const titles = new Map(listings.map((l) => [l.id as string, l.title as string]));

  const { data } = await supabase
    .from("vibe_slots")
    .select("id, listing_id, starts_at, capacity, booked")
    .in("listing_id", [...titles.keys()])
    .eq("status", "open")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(limit);

  return (data ?? []).map((s) => ({
    id: s.id as string,
    listingId: s.listing_id as string,
    listingTitle: titles.get(s.listing_id as string) ?? "",
    startsAt: s.starts_at as string,
    capacity: s.capacity as number,
    booked: s.booked as number,
  }));
}

/** Days (`YYYY-MM-DD`) the vendor closed, from the first day up to but not including the last. Dynamic. */
export async function getVibeBlockedDays(listingId: string, fromDay: string, toDay: string): Promise<string[]> {
  await connection();
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return [];

  const { data } = await supabase
    .from("vibe_blocked_dates")
    .select("day")
    .eq("listing_id", listingId)
    .gte("day", fromDay)
    .lt("day", toDay)
    .order("day");
  return (data ?? []).map((row) => row.day as string);
}
