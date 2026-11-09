import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { readiness, type ReadinessItem } from "./readiness";
import type { CancellationPolicy } from "./policy";
import type { Currency } from "./types";

export type PlaceRow = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  parish: string;
  lat: number;
  lng: number;
};

export type MoveListingView = {
  profile: { id: string; status: string; photoVerifiedAt: string | null };
  profilePhotoLink: string | null;
  listing: {
    id: string;
    currency: Currency;
    islandWide: boolean;
    baseFare: number | null;
    perKm: number | null;
    hourlyRate: number | null;
    description: string | null;
    cancellationPolicy: CancellationPolicy;
    status: "draft" | "in_review" | "live";
    paused: boolean;
    reviewNote: string | null;
  } | null;
  placeIds: string[];
  flatRates: { id: string; placeAId: string; placeBId: string; price: number }[];
  windows: { id: string; weekday: number; startMinutes: number; endMinutes: number }[];
  blocks: { id: string; startsAt: string; endsAt: string; note: string | null }[];
  vehicle: {
    id: string;
    label: string;
    seats: number;
    luggageLarge: number;
    luggageCarryOn: number;
    photos: { id: string; kind: string; path: string }[];
  } | null;
  openFlags: { id: string; kind: string }[];
  readiness: { ready: boolean; missing: ReadinessItem[] };
};

/** All places a MOVE trip can start or end at. Public data. */
export async function getPlaces(): Promise<PlaceRow[]> {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase
    .from("places")
    .select("id, slug, name, kind, parish, lat, lng")
    .eq("active", true)
    .order("name");
  return (data ?? []).map((p) => ({ ...p, lat: Number(p.lat), lng: Number(p.lng) }));
}

/** Road distance estimates between place pairs, keyed `<lower id>|<higher id>`. */
export async function getPlaceRoutes(): Promise<Record<string, { km: number; minutes: number }>> {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.from("place_routes").select("from_place_id, to_place_id, km, minutes");
  const routes: Record<string, { km: number; minutes: number }> = {};
  for (const row of data ?? []) {
    routes[`${row.from_place_id}|${row.to_place_id}`] = { km: Number(row.km), minutes: row.minutes };
  }
  return routes;
}

/** The signed-in MOVE vendor's listing with everything the editor needs. Dynamic. */
export async function getMyListing(): Promise<MoveListingView | null> {
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from("vendor_profiles")
    .select("id, status, photo_verified_at")
    .eq("account_id", auth.user.id)
    .eq("category", "move")
    .maybeSingle();
  if (!profile) return null;

  const [{ data: me }, { data: listing }, { data: vehicle }] = await Promise.all([
    supabase.from("profiles").select("profile_photo_link").eq("id", auth.user.id).maybeSingle(),
    supabase
      .from("move_listings")
      .select("id, currency, island_wide, base_fare, per_km, hourly_rate, description, cancellation_policy, status, paused, review_note")
      .eq("vendor_profile_id", profile.id)
      .maybeSingle(),
    supabase
      .from("vendor_vehicles")
      .select("id, make, model, year, passenger_capacity, luggage_large, luggage_carry_on")
      .eq("vendor_profile_id", profile.id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const [places, rates, windows, blocks, photos, flags] = await Promise.all([
    listing
      ? supabase.from("move_listing_places").select("place_id").eq("listing_id", listing.id)
      : Promise.resolve({ data: [] }),
    listing
      ? supabase.from("move_flat_rates").select("id, place_a_id, place_b_id, price").eq("listing_id", listing.id)
      : Promise.resolve({ data: [] }),
    listing
      ? supabase
          .from("move_availability_rules")
          .select("id, weekday, start_minutes, end_minutes")
          .eq("listing_id", listing.id)
          .order("weekday")
          .order("start_minutes")
      : Promise.resolve({ data: [] }),
    listing
      ? supabase
          .from("move_blocked_ranges")
          .select("id, starts_at, ends_at, note")
          .eq("listing_id", listing.id)
          .order("starts_at")
      : Promise.resolve({ data: [] }),
    vehicle
      ? supabase.from("vehicle_photos").select("id, kind, storage_path").eq("vehicle_id", vehicle.id).order("position")
      : Promise.resolve({ data: [] }),
    listing
      ? supabase.from("listing_flags").select("id, kind").eq("listing_id", listing.id).is("resolved_at", null)
      : Promise.resolve({ data: [] }),
  ]);

  const view: MoveListingView = {
    profile: { id: profile.id, status: profile.status, photoVerifiedAt: profile.photo_verified_at },
    profilePhotoLink: me?.profile_photo_link ?? null,
    listing: listing
      ? {
          id: listing.id,
          currency: listing.currency as Currency,
          islandWide: listing.island_wide,
          baseFare: listing.base_fare === null ? null : Number(listing.base_fare),
          perKm: listing.per_km === null ? null : Number(listing.per_km),
          hourlyRate: listing.hourly_rate === null ? null : Number(listing.hourly_rate),
          description: listing.description,
          cancellationPolicy: listing.cancellation_policy as CancellationPolicy,
          status: listing.status as "draft" | "in_review" | "live",
          paused: listing.paused,
          reviewNote: listing.review_note,
        }
      : null,
    placeIds: (places.data ?? []).map((row) => row.place_id),
    flatRates: (rates.data ?? []).map((row) => ({
      id: row.id,
      placeAId: row.place_a_id,
      placeBId: row.place_b_id,
      price: Number(row.price),
    })),
    windows: (windows.data ?? []).map((row) => ({
      id: row.id,
      weekday: row.weekday,
      startMinutes: row.start_minutes,
      endMinutes: row.end_minutes,
    })),
    blocks: (blocks.data ?? []).map((row) => ({
      id: row.id,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      note: row.note,
    })),
    vehicle: vehicle
      ? {
          id: vehicle.id,
          label: `${vehicle.make} ${vehicle.model} ${vehicle.year}`,
          seats: vehicle.passenger_capacity,
          luggageLarge: vehicle.luggage_large,
          luggageCarryOn: vehicle.luggage_carry_on,
          photos: (photos.data ?? []).map((row) => ({ id: row.id, kind: row.kind, path: row.storage_path })),
        }
      : null,
    openFlags: (flags.data ?? []).map((row) => ({ id: row.id, kind: row.kind })),
    readiness: { ready: false, missing: [] },
  };

  view.readiness = readiness({
    profileApproved: profile.status === "approved",
    vehicle: view.vehicle
      ? {
          luggageLarge: view.vehicle.luggageLarge,
          luggageCarryOn: view.vehicle.luggageCarryOn,
          photoKinds: view.vehicle.photos.map((p) => p.kind),
        }
      : null,
    profilePhotoVerified: Boolean(profile.photo_verified_at) && Boolean(me?.profile_photo_link),
    islandWide: view.listing?.islandWide ?? false,
    placeCount: view.placeIds.length,
    flatRateCount: view.flatRates.length,
    baseFare: view.listing?.baseFare ?? null,
    perKm: view.listing?.perKm ?? null,
    windowCount: view.windows.length,
  });
  return view;
}
