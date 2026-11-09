"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { GENERIC, failure, requireUser, type Client } from "@/lib/auth/action-helpers";
import { fromZod, type ActionResult } from "@/lib/auth/result";
import {
  availabilitySchema,
  blockedRangeSchema,
  coverageSchema,
  flatRateSchema,
  isOwnPhotoPath,
  listingSchema,
  luggageSchema,
  photoSchema,
  placeSuggestionSchema,
  unblockRangeSchema,
} from "@/lib/schemas/move";

import { mergeRanges, subtractRange, type Range } from "./ranges";

const NEED_BUSINESS = "Save your business details first.";
const NEED_LISTING = "Save your listing details first.";
const BAD_PATH = "That file path is not allowed.";

const LISTING_PATH = "/v/move/listing";

async function moveProfileId(supabase: Client, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("vendor_profiles")
    .select("id")
    .eq("account_id", userId)
    .eq("category", "move")
    .maybeSingle();
  return data?.id ?? null;
}

async function listingIdFor(supabase: Client, profileId: string): Promise<string | null> {
  const { data } = await supabase
    .from("move_listings")
    .select("id")
    .eq("vendor_profile_id", profileId)
    .maybeSingle();
  return data?.id ?? null;
}

type Owned = { supabase: Client; userId: string; profileId: string; listingId: string | null };

async function requireVendor(): Promise<Owned | { failure: Extract<ActionResult, { ok: false }> }> {
  const session = await requireUser();
  if ("failure" in session) return session;
  const profileId = await moveProfileId(session.supabase, session.userId);
  if (!profileId) return { failure: { ok: false, error: NEED_BUSINESS } };
  const listingId = await listingIdFor(session.supabase, profileId);
  return { ...session, profileId, listingId };
}

async function requireListing(): Promise<
  (Owned & { listingId: string }) | { failure: Extract<ActionResult, { ok: false }> }
> {
  const owned = await requireVendor();
  if ("failure" in owned) return owned;
  if (!owned.listingId) return { failure: { ok: false, error: NEED_LISTING } };
  return { ...owned, listingId: owned.listingId };
}

export async function saveListingAction(input: unknown): Promise<ActionResult> {
  const owned = await requireVendor();
  if ("failure" in owned) return owned.failure;
  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const d = parsed.data;
  const row = {
    currency: d.currency,
    island_wide: d.islandWide,
    base_fare: d.baseFare,
    per_km: d.perKm,
    hourly_rate: d.hourlyRate,
    cancellation_policy: d.cancellationPolicy,
    description: d.description,
  };
  const { error } = owned.listingId
    ? await owned.supabase.from("move_listings").update(row).eq("id", owned.listingId)
    : await owned.supabase.from("move_listings").insert({ vendor_profile_id: owned.profileId, ...row });
  if (error) return failure("Saving the listing failed", error);

  revalidatePath(LISTING_PATH);
  return { ok: true };
}

export async function setPausedAction(paused: boolean): Promise<ActionResult> {
  const owned = await requireListing();
  if ("failure" in owned) return owned.failure;
  if (typeof paused !== "boolean") return { ok: false, error: GENERIC };

  const { error } = await owned.supabase
    .from("move_listings")
    .update({ paused })
    .eq("id", owned.listingId);
  if (error) return failure("Pausing the listing failed", error);

  revalidatePath("/v");
  revalidatePath(LISTING_PATH);
  return { ok: true };
}

/** Replaces the places the vendor serves. Dropping a place also drops its flat rates. */
export async function setCoverageAction(input: unknown): Promise<ActionResult> {
  const owned = await requireListing();
  if ("failure" in owned) return owned.failure;
  const parsed = coverageSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const wanted = new Set(parsed.data.placeIds);
  const { data: current, error: readError } = await owned.supabase
    .from("move_listing_places")
    .select("place_id")
    .eq("listing_id", owned.listingId);
  if (readError) return failure("Reading coverage failed", readError);

  const have = new Set((current ?? []).map((row) => row.place_id));
  const removed = [...have].filter((id) => !wanted.has(id));
  const added = [...wanted].filter((id) => !have.has(id));

  if (removed.length > 0) {
    const { error } = await owned.supabase
      .from("move_listing_places")
      .delete()
      .eq("listing_id", owned.listingId)
      .in("place_id", removed);
    if (error) return failure("Removing places failed", error);
  }
  if (added.length > 0) {
    const { error } = await owned.supabase
      .from("move_listing_places")
      .insert(added.map((placeId) => ({ listing_id: owned.listingId, place_id: placeId })));
    if (error) return failure("Adding places failed", error);
  }

  revalidatePath(LISTING_PATH);
  return { ok: true };
}

export async function saveFlatRateAction(input: unknown): Promise<ActionResult> {
  const owned = await requireListing();
  if ("failure" in owned) return owned.failure;
  const parsed = flatRateSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const [a, b] =
    parsed.data.placeAId < parsed.data.placeBId
      ? [parsed.data.placeAId, parsed.data.placeBId]
      : [parsed.data.placeBId, parsed.data.placeAId];
  const { error } = await owned.supabase.from("move_flat_rates").upsert(
    { listing_id: owned.listingId, place_a_id: a, place_b_id: b, price: parsed.data.price },
    { onConflict: "listing_id,place_a_id,place_b_id" },
  );
  if (error) return failure("Saving the rate failed", error);

  revalidatePath(LISTING_PATH);
  return { ok: true };
}

export async function deleteFlatRateAction(rateId: string): Promise<ActionResult> {
  const owned = await requireListing();
  if ("failure" in owned) return owned.failure;
  if (!z.uuid().safeParse(rateId).success) return { ok: false, error: GENERIC };

  const { error } = await owned.supabase
    .from("move_flat_rates")
    .delete()
    .eq("id", rateId)
    .eq("listing_id", owned.listingId);
  if (error) return failure("Removing the rate failed", error);

  revalidatePath(LISTING_PATH);
  return { ok: true };
}

/** Replaces the whole weekly schedule. */
export async function saveAvailabilityAction(input: unknown): Promise<ActionResult> {
  const owned = await requireListing();
  if ("failure" in owned) return owned.failure;
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { error: deleteError } = await owned.supabase
    .from("move_availability_rules")
    .delete()
    .eq("listing_id", owned.listingId);
  if (deleteError) return failure("Clearing the schedule failed", deleteError);

  if (parsed.data.windows.length > 0) {
    const { error } = await owned.supabase.from("move_availability_rules").insert(
      parsed.data.windows.map((w) => ({
        listing_id: owned.listingId,
        weekday: w.weekday,
        start_minutes: w.startMinutes,
        end_minutes: w.endMinutes,
      })),
    );
    if (error) return failure("Saving the schedule failed", error);
  }

  revalidatePath(LISTING_PATH);
  revalidatePath("/v/move/calendar");
  return { ok: true };
}

async function overlappingBlocks(supabase: Client, listingId: string, range: Range) {
  const { data, error } = await supabase
    .from("move_blocked_ranges")
    .select("id, starts_at, ends_at, note")
    .eq("listing_id", listingId)
    .lte("starts_at", range.end.toISOString())
    .gte("ends_at", range.start.toISOString());
  return { data: data ?? [], error };
}

/** Blocks a stretch of time, joining it to any blocks it touches. */
export async function blockRangeAction(input: unknown): Promise<ActionResult> {
  const owned = await requireListing();
  if ("failure" in owned) return owned.failure;
  const parsed = blockedRangeSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const added: Range = { start: new Date(parsed.data.startsAt), end: new Date(parsed.data.endsAt) };
  const { data: touching, error: readError } = await overlappingBlocks(owned.supabase, owned.listingId, added);
  if (readError) return failure("Reading blocked dates failed", readError);

  const merged = mergeRanges([
    added,
    ...touching.map((row) => ({ start: new Date(row.starts_at), end: new Date(row.ends_at) })),
  ]);
  if (touching.length > 0) {
    const { error } = await owned.supabase
      .from("move_blocked_ranges")
      .delete()
      .in("id", touching.map((row) => row.id));
    if (error) return failure("Joining blocked dates failed", error);
  }
  const { error } = await owned.supabase.from("move_blocked_ranges").insert(
    merged.map((range) => ({
      listing_id: owned.listingId,
      starts_at: range.start.toISOString(),
      ends_at: range.end.toISOString(),
      note: parsed.data.note?.trim() || touching[0]?.note || null,
    })),
  );
  if (error) return failure("Blocking dates failed", error);

  revalidatePath("/v/move/calendar");
  return { ok: true };
}

/** Frees a stretch of time, trimming or splitting the blocks it cuts through. */
export async function unblockRangeAction(input: unknown): Promise<ActionResult> {
  const owned = await requireListing();
  if ("failure" in owned) return owned.failure;
  const parsed = unblockRangeSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const cut: Range = { start: new Date(parsed.data.startsAt), end: new Date(parsed.data.endsAt) };
  const { data: touching, error: readError } = await overlappingBlocks(owned.supabase, owned.listingId, cut);
  if (readError) return failure("Reading blocked dates failed", readError);
  if (touching.length === 0) return { ok: true };

  const pieces = subtractRange(
    touching.map((row) => ({ start: new Date(row.starts_at), end: new Date(row.ends_at) })),
    cut,
  );
  const { error: deleteError } = await owned.supabase
    .from("move_blocked_ranges")
    .delete()
    .in("id", touching.map((row) => row.id));
  if (deleteError) return failure("Freeing dates failed", deleteError);

  if (pieces.length > 0) {
    const { error } = await owned.supabase.from("move_blocked_ranges").insert(
      pieces.map((range) => ({
        listing_id: owned.listingId,
        starts_at: range.start.toISOString(),
        ends_at: range.end.toISOString(),
        note: touching[0]?.note ?? null,
      })),
    );
    if (error) return failure("Freeing dates failed", error);
  }

  revalidatePath("/v/move/calendar");
  return { ok: true };
}

export async function saveLuggageAction(input: unknown): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const parsed = luggageSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await session.supabase.rpc("save_vehicle_luggage", {
    p_vehicle_id: parsed.data.vehicleId,
    p_large: parsed.data.large,
    p_carry_on: parsed.data.carryOn,
  });
  if (error) return failure("Saving luggage capacity failed", error);

  revalidatePath(LISTING_PATH);
  return { ok: true };
}

/** Records a photo the browser already uploaded to the user's own folder. */
export async function registerVehiclePhotoAction(input: unknown): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const parsed = photoSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { vehicleId, kind, path } = parsed.data;
  if (!isOwnPhotoPath(path, session.userId, vehicleId)) return { ok: false, error: BAD_PATH };

  // A required kind is replaced, so re-uploading "front" swaps the old photo.
  if (kind !== "extra") {
    const { error } = await session.supabase
      .from("vehicle_photos")
      .delete()
      .eq("vehicle_id", vehicleId)
      .eq("kind", kind);
    if (error) return failure("Replacing the photo failed", error);
  }
  const { error } = await session.supabase
    .from("vehicle_photos")
    .insert({ vehicle_id: vehicleId, kind, storage_path: path });
  if (error) return failure("Saving the photo failed", error);

  revalidatePath(LISTING_PATH);
  return { ok: true };
}

export async function removeVehiclePhotoAction(photoId: string): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  if (!z.uuid().safeParse(photoId).success) return { ok: false, error: GENERIC };

  const { data: photo } = await session.supabase
    .from("vehicle_photos")
    .select("storage_path")
    .eq("id", photoId)
    .maybeSingle();
  const { error } = await session.supabase.from("vehicle_photos").delete().eq("id", photoId);
  if (error) return failure("Removing the photo failed", error);
  if (photo?.storage_path) {
    await session.supabase.storage.from("listing-photos").remove([photo.storage_path]);
  }

  revalidatePath(LISTING_PATH);
  return { ok: true };
}

export async function submitListingAction(): Promise<ActionResult> {
  const owned = await requireListing();
  if ("failure" in owned) return owned.failure;

  const { error } = await owned.supabase.rpc("submit_listing_for_review", {
    p_listing_id: owned.listingId,
  });
  if (error) return failure("Submitting the listing failed", error);

  revalidatePath("/v");
  revalidatePath(LISTING_PATH);
  return { ok: true };
}

export async function suggestPlaceAction(input: unknown): Promise<ActionResult> {
  const owned = await requireVendor();
  if ("failure" in owned) return owned.failure;
  const parsed = placeSuggestionSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await owned.supabase.from("place_suggestions").insert({
    vendor_profile_id: owned.profileId,
    name: parsed.data.name,
    note: parsed.data.note || null,
  });
  if (error) return failure("Suggesting a place failed", error);

  return { ok: true };
}
