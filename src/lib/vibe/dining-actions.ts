"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, requireUser, type Client } from "@/lib/auth/action-helpers";
import { fromZod, type ActionResult, type FailedResult } from "@/lib/auth/result";
import { businessHoursSetSchema, diningDetailsSchema } from "@/lib/schemas/dining";

const NOT_FOUND: FailedResult = { ok: false, error: "We couldn't find that." };

function refresh(listingId: string): void {
  revalidatePath("/v/vibe");
  revalidatePath("/v/vibe/listings");
  revalidatePath(`/v/vibe/listings/${listingId}`);
}

type Session = { supabase: Client; userId: string };

/**
 * The signed-in vendor, once the listing is confirmed to be theirs (row-level security hides others).
 * Kept here rather than imported: a "use server" file may only export actions.
 */
async function requireListing(listingId: string): Promise<Session | { failure: FailedResult }> {
  const session = await requireUser();
  if ("failure" in session) return session;
  if (!z.uuid().safeParse(listingId).success) return { failure: NOT_FOUND };
  const { data } = await session.supabase.from("vibe_listings").select("id").eq("id", listingId).maybeSingle();
  if (!data) return { failure: NOT_FOUND };
  return session;
}

/**
 * Saves the dining-only facts of a listing. The first save is an insert and later saves are updates:
 * an upsert would try to write listing_id, which is not updatable (it would move the details to
 * another listing and get round the booking-mode lock). The database refuses a changed booking
 * mode with a message meant for the vendor, which `failure` passes on.
 */
export async function saveDiningDetailsAction(listingId: string, input: unknown): Promise<ActionResult> {
  const owned = await requireListing(listingId);
  if ("failure" in owned) return owned.failure;
  const parsed = diningDetailsSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const d = parsed.data;
  const row = {
    venue_type: d.venueType,
    dine_in: d.dineIn,
    takeout: d.takeout,
    cuisine_types: d.cuisineTypes,
    price_tier: d.priceTier,
    booking_mode: d.bookingMode,
    reservation_style: d.reservationStyle,
  };

  const { data: existing } = await owned.supabase
    .from("vibe_dining_profiles")
    .select("listing_id")
    .eq("listing_id", listingId)
    .maybeSingle();
  const { error } = existing
    ? await owned.supabase.from("vibe_dining_profiles").update(row).eq("listing_id", listingId)
    : await owned.supabase.from("vibe_dining_profiles").insert({ listing_id: listingId, ...row });
  if (error) return failure("Saving the dining details failed", error);

  refresh(listingId);
  return { ok: true };
}

/** Replaces the whole week of opening hours. Days left out are closed. */
export async function saveBusinessHoursAction(listingId: string, input: unknown): Promise<ActionResult> {
  const owned = await requireListing(listingId);
  if ("failure" in owned) return owned.failure;
  const parsed = businessHoursSetSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Please check the opening hours." };
  }

  const { error: deleteError } = await owned.supabase.from("vibe_business_hours").delete().eq("listing_id", listingId);
  if (deleteError) return failure("Clearing the opening hours failed", deleteError);

  if (parsed.data.length > 0) {
    const { error } = await owned.supabase.from("vibe_business_hours").insert(
      parsed.data.map((row) => ({
        listing_id: listingId,
        weekday: row.weekday,
        opens_minutes: row.opensMinutes,
        closes_minutes: row.closesMinutes,
      })),
    );
    if (error) return failure("Saving the opening hours failed", error);
  }

  refresh(listingId);
  return { ok: true };
}
