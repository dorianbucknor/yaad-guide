import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";

import type { PlaceRow } from "./queries";

export type AdminPlace = PlaceRow & { active: boolean };
export type PlaceSuggestionRow = { id: string; name: string; note: string | null; businessName: string; createdAt: string };

export type ReviewListing = {
  id: string;
  businessName: string;
  ownerName: string;
  region: string;
  currency: string;
  description: string | null;
  placeCount: number;
  islandWide: boolean;
  flatRateCount: number;
  baseFare: number | null;
  perKm: number | null;
  submittedAt: string;
};

export type OpenFlag = { id: string; kind: string; createdAt: string; listingId: string; businessName: string };

async function clientWith(permission: "places.manage" | "listings.review") {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.rpc("authorize", { p_permission: permission });
  return data === true ? supabase : null;
}

const one = <T>(value: T | T[] | null | undefined): T | undefined => (Array.isArray(value) ? value[0] : (value ?? undefined));

export async function getPlacesAdmin(): Promise<{ places: AdminPlace[]; suggestions: PlaceSuggestionRow[] } | null> {
  const supabase = await clientWith("places.manage");
  if (!supabase) return null;

  const [{ data: places }, { data: suggestions }] = await Promise.all([
    supabase.from("places").select("id, slug, name, kind, parish, lat, lng, active").order("name"),
    supabase
      .from("place_suggestions")
      .select("id, name, note, created_at, vendor_profiles(business_name)")
      .eq("status", "open")
      .order("created_at"),
  ]);

  return {
    places: (places ?? []).map((p) => ({ ...p, lat: Number(p.lat), lng: Number(p.lng) })),
    suggestions: (suggestions ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      note: s.note,
      createdAt: s.created_at,
      businessName: one(s.vendor_profiles as { business_name: string | null } | { business_name: string | null }[] | null)?.business_name || "A vendor",
    })),
  };
}

export async function getListingQueue(): Promise<{ listings: ReviewListing[]; flags: OpenFlag[] } | null> {
  const supabase = await clientWith("listings.review");
  if (!supabase) return null;

  const { data: waiting } = await supabase
    .from("move_listings")
    .select(
      "id, currency, description, island_wide, base_fare, per_km, updated_at, vendor_profiles(account_id, business_name, primary_region), move_listing_places(place_id), move_flat_rates(id)",
    )
    .eq("status", "in_review")
    .order("updated_at");

  const ownerIds = (waiting ?? []).map((l) => one(l.vendor_profiles as { account_id: string } | { account_id: string }[] | null)?.account_id).filter((v): v is string => Boolean(v));
  const { data: owners } = ownerIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", ownerIds)
    : { data: [] };

  const listings = (waiting ?? []).map((l) => {
    const vp = one(
      l.vendor_profiles as
        | { account_id: string; business_name: string | null; primary_region: string }
        | { account_id: string; business_name: string | null; primary_region: string }[]
        | null,
    );
    const owner = owners?.find((o) => o.id === vp?.account_id);
    const ownerName = owner ? `${owner.first_name} ${owner.last_name}`.trim() : "";
    return {
      id: l.id,
      businessName: vp?.business_name || ownerName || "Unnamed",
      ownerName: ownerName || "Unnamed",
      region: vp?.primary_region ?? "",
      currency: l.currency,
      description: l.description,
      placeCount: (l.move_listing_places as unknown[] | null)?.length ?? 0,
      islandWide: l.island_wide,
      flatRateCount: (l.move_flat_rates as unknown[] | null)?.length ?? 0,
      baseFare: l.base_fare === null ? null : Number(l.base_fare),
      perKm: l.per_km === null ? null : Number(l.per_km),
      submittedAt: l.updated_at,
    };
  });

  const { data: flags } = await supabase
    .from("listing_flags")
    .select("id, kind, created_at, listing_id, move_listings(vendor_profiles(business_name))")
    .is("resolved_at", null)
    .order("created_at");

  return {
    listings,
    flags: (flags ?? []).map((f) => {
      const listing = one(f.move_listings as { vendor_profiles: unknown } | { vendor_profiles: unknown }[] | null);
      const vp = one(listing?.vendor_profiles as { business_name: string | null } | { business_name: string | null }[] | null);
      return { id: f.id, kind: f.kind, createdAt: f.created_at, listingId: f.listing_id, businessName: vp?.business_name || "A vendor" };
    }),
  };
}
