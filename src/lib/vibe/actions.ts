"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { GENERIC, failure, requireUser, type Client } from "@/lib/auth/action-helpers";
import { fromZod, type ActionResult, type FailedResult } from "@/lib/auth/result";
import { listMyVibeEntities, pickVibeEntity } from "./entities";
import {
  addressSchema,
  closeDateSchema,
  closeRangeSchema,
  isOwnVibePhotoPath,
  manualSlotSchema,
  policySchema,
  scheduleSchema,
  slotEditSchema,
  ticketTypeSchema,
  vibeBasicsSchema,
  vibePhotoSchema,
} from "@/lib/schemas/vibe";

const NEED_BUSINESS = "Save your business details first.";
const BAD_PATH = "That file path is not allowed.";
const NOT_FOUND: FailedResult = { ok: false, error: "We couldn't find that." };
const DUPLICATE_SLOT = "There is already a slot at that time.";

const LIST_PATH = "/v/vibe/listings";
const CALENDAR_PATH = "/v/vibe/calendar";

function refresh(listingId?: string): void {
  revalidatePath("/v/vibe");
  revalidatePath(LIST_PATH);
  if (listingId) revalidatePath(`${LIST_PATH}/${listingId}`);
  revalidatePath(CALENDAR_PATH);
}

type Session = { supabase: Client; userId: string };

/** The signed-in vendor, once the listing is confirmed to be theirs (row-level security hides others). */
async function requireListing(listingId: string): Promise<Session | { failure: FailedResult }> {
  const session = await requireUser();
  if ("failure" in session) return session;
  if (!z.uuid().safeParse(listingId).success) return { failure: NOT_FOUND };
  const { data } = await session.supabase.from("vibe_listings").select("id").eq("id", listingId).maybeSingle();
  if (!data) return { failure: NOT_FOUND };
  return session;
}

export async function createListingAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const parsed = vibeBasicsSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const entities = await listMyVibeEntities(session.supabase, session.userId);
  if (entities.length === 0) return { ok: false, error: NEED_BUSINESS };
  const profile = pickVibeEntity(entities, parsed.data.entityId);
  if (!profile) return { ok: false, error: "Choose which business this listing is for." };

  const d = parsed.data;
  // The id is chosen here: asking the insert to return the row would be refused, because the
  // read policy cannot see a row that is still being inserted.
  const id = crypto.randomUUID();
  const { error } = await session.supabase
    .from("vibe_listings")
    .insert({
      id,
      vendor_profile_id: profile.id,
      subtype: d.subtype,
      title: d.title,
      description: d.description,
      area: d.area,
      currency: d.currency,
      duration_minutes: d.durationMinutes,
      booking_cutoff_minutes: d.bookingCutoffMinutes,
      cancellation_policy: d.cancellationPolicy,
    });
  if (error) return failure("Creating the listing failed", error);

  refresh(id);
  return { ok: true, data: { id } };
}

export async function saveBasicsAction(listingId: string, input: unknown): Promise<ActionResult> {
  const owned = await requireListing(listingId);
  if ("failure" in owned) return owned.failure;
  const parsed = vibeBasicsSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const d = parsed.data;
  const { error } = await owned.supabase
    .from("vibe_listings")
    .update({
      subtype: d.subtype,
      title: d.title,
      description: d.description,
      area: d.area,
      currency: d.currency,
      duration_minutes: d.durationMinutes,
      booking_cutoff_minutes: d.bookingCutoffMinutes,
      cancellation_policy: d.cancellationPolicy,
    })
    .eq("id", listingId);
  if (error) return failure("Saving the listing failed", error);

  refresh(listingId);
  return { ok: true };
}

export async function savePolicyAction(listingId: string, input: unknown): Promise<ActionResult> {
  const owned = await requireListing(listingId);
  if ("failure" in owned) return owned.failure;
  const parsed = policySchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await owned.supabase
    .from("vibe_listings")
    .update({ cancellation_policy: parsed.data.cancellationPolicy })
    .eq("id", listingId);
  if (error) return failure("Saving the cancellation policy failed", error);

  refresh(listingId);
  return { ok: true };
}

export async function saveLocationAction(listingId: string, input: unknown): Promise<ActionResult> {
  const owned = await requireListing(listingId);
  if ("failure" in owned) return owned.failure;
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const d = parsed.data;
  const { error } = await owned.supabase
    .from("vibe_listings")
    .update({
      address_line1: d.addressLine1,
      address_line2: d.addressLine2,
      town: d.town,
      parish: d.parish,
      latitude: d.latitude,
      longitude: d.longitude,
    })
    .eq("id", listingId);
  if (error) return failure("Saving the location failed", error);

  refresh(listingId);
  return { ok: true };
}

/** Free tickets are confirmed here and again in the database function, so a client cannot skip it. */
export async function saveTicketTypeAction(listingId: string, input: unknown): Promise<ActionResult> {
  const owned = await requireListing(listingId);
  if ("failure" in owned) return owned.failure;
  const parsed = ticketTypeSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const d = parsed.data;
  const { error } = await owned.supabase.rpc("save_vibe_ticket_type", {
    p_listing_id: listingId,
    p_id: d.id ?? null,
    p_name: d.name,
    p_description: d.description,
    p_price: d.price,
    p_discount_percent: d.discountPercent,
    p_max_per_booking: d.maxPerBooking,
    p_sort_order: 0,
    p_confirm_free: d.confirmFree,
  });
  if (error) return failure("Saving the ticket failed", error);

  refresh(listingId);
  return { ok: true };
}

export async function deleteTicketTypeAction(ticketId: string): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  if (!z.uuid().safeParse(ticketId).success) return { ok: false, error: GENERIC };

  const { error } = await session.supabase.from("vibe_ticket_types").delete().eq("id", ticketId);
  if (error) return failure("Removing the ticket failed", error);

  refresh();
  return { ok: true };
}

/** Sets the auto-generation switch and replaces the whole weekly pattern. */
export async function saveScheduleAction(listingId: string, input: unknown): Promise<ActionResult> {
  const owned = await requireListing(listingId);
  if ("failure" in owned) return owned.failure;
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { error: flagError } = await owned.supabase
    .from("vibe_listings")
    .update({ auto_generate_slots: parsed.data.autoGenerate })
    .eq("id", listingId);
  if (flagError) return failure("Saving the schedule failed", flagError);

  const { error: deleteError } = await owned.supabase.from("vibe_schedule_rules").delete().eq("listing_id", listingId);
  if (deleteError) return failure("Clearing the schedule failed", deleteError);

  if (parsed.data.rules.length > 0) {
    const { error } = await owned.supabase.from("vibe_schedule_rules").insert(
      parsed.data.rules.map((rule) => ({
        listing_id: listingId,
        weekday: rule.weekday,
        start_minutes: rule.startMinutes,
        capacity: rule.capacity,
        valid_from: rule.validFrom,
        valid_until: rule.validUntil,
      })),
    );
    if (error) return failure("Saving the schedule failed", error);
  }

  refresh(listingId);
  return { ok: true };
}

export async function addSlotAction(listingId: string, input: unknown): Promise<ActionResult> {
  const owned = await requireListing(listingId);
  if ("failure" in owned) return owned.failure;
  const parsed = manualSlotSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await owned.supabase.from("vibe_slots").insert({
    listing_id: listingId,
    starts_at: parsed.data.startsAt,
    capacity: parsed.data.capacity,
  });
  if (error?.code === "23505") return { ok: false, error: DUPLICATE_SLOT };
  if (error) return failure("Adding the slot failed", error);

  refresh(listingId);
  return { ok: true };
}

export async function editSlotAction(input: unknown): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const parsed = slotEditSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { data, error } = await session.supabase
    .from("vibe_slots")
    .update({ capacity: parsed.data.capacity, status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return failure("Saving the slot failed", error);
  if (!data || data.length === 0) return NOT_FOUND;

  refresh();
  return { ok: true };
}

export async function deleteSlotAction(slotId: string): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  if (!z.uuid().safeParse(slotId).success) return { ok: false, error: GENERIC };

  const { error } = await session.supabase.from("vibe_slots").delete().eq("id", slotId);
  if (error) return failure("Removing the slot failed", error);

  refresh();
  return { ok: true };
}

export async function setDateClosedAction(listingId: string, input: unknown): Promise<ActionResult> {
  const owned = await requireListing(listingId);
  if ("failure" in owned) return owned.failure;
  const parsed = closeDateSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await owned.supabase.rpc("set_vibe_date_closed", {
    p_listing_id: listingId,
    p_day: parsed.data.day,
    p_closed: parsed.data.closed,
  });
  if (error) return failure("Changing the date failed", error);

  refresh(listingId);
  return { ok: true };
}

/** Closes or reopens a run of days. If any day has bookings, none change. */
export async function setDatesClosedAction(listingId: string, input: unknown): Promise<ActionResult> {
  const owned = await requireListing(listingId);
  if ("failure" in owned) return owned.failure;
  const parsed = closeRangeSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await owned.supabase.rpc("set_vibe_dates_closed", {
    p_listing_id: listingId,
    p_from: parsed.data.from,
    p_to: parsed.data.to,
    p_closed: parsed.data.closed,
  });
  if (error) return failure("Changing the dates failed", error);

  refresh(listingId);
  return { ok: true };
}

export async function clearAutoSlotsAction(listingId: string): Promise<ActionResult<{ cleared: number }>> {
  const owned = await requireListing(listingId);
  if ("failure" in owned) return owned.failure;

  const { data, error } = await owned.supabase.rpc("clear_vibe_auto_slots", { p_listing_id: listingId });
  if (error) return failure("Clearing the slots failed", error);

  refresh(listingId);
  return { ok: true, data: { cleared: Number(data ?? 0) } };
}

/** Records a photo the browser already uploaded to the vendor's own folder. */
export async function recordPhotoAction(input: unknown): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const parsed = vibePhotoSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { listingId, path } = parsed.data;
  if (!isOwnVibePhotoPath(path, session.userId, listingId)) return { ok: false, error: BAD_PATH };

  const owned = await requireListing(listingId);
  if ("failure" in owned) return owned.failure;

  const { data: existing } = await owned.supabase.from("vibe_photos").select("id").eq("listing_id", listingId);
  const count = existing?.length ?? 0;
  const { error } = await owned.supabase
    .from("vibe_photos")
    .insert({ listing_id: listingId, storage_path: path, is_cover: count === 0, position: count });
  if (error) return failure("Saving the photo failed", error);

  refresh(listingId);
  return { ok: true };
}

export async function removePhotoAction(photoId: string): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  if (!z.uuid().safeParse(photoId).success) return { ok: false, error: GENERIC };

  const { data: photo } = await session.supabase
    .from("vibe_photos")
    .select("storage_path, is_cover, listing_id")
    .eq("id", photoId)
    .maybeSingle();
  if (!photo) return NOT_FOUND;

  const { error } = await session.supabase.from("vibe_photos").delete().eq("id", photoId);
  if (error) return failure("Removing the photo failed", error);
  await session.supabase.storage.from("listing-photos").remove([photo.storage_path]);

  // The cover went: the next photo takes its place.
  if (photo.is_cover) {
    const { data: next } = await session.supabase
      .from("vibe_photos")
      .select("id")
      .eq("listing_id", photo.listing_id)
      .order("position")
      .limit(1)
      .maybeSingle();
    if (next) await session.supabase.from("vibe_photos").update({ is_cover: true }).eq("id", next.id);
  }

  refresh(photo.listing_id);
  return { ok: true };
}

export async function setCoverPhotoAction(photoId: string): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  if (!z.uuid().safeParse(photoId).success) return { ok: false, error: GENERIC };

  const { data: photo } = await session.supabase
    .from("vibe_photos")
    .select("listing_id")
    .eq("id", photoId)
    .maybeSingle();
  if (!photo) return NOT_FOUND;

  // Only one cover per listing: clear the old one before setting the new one.
  const { error: clearError } = await session.supabase
    .from("vibe_photos")
    .update({ is_cover: false })
    .eq("listing_id", photo.listing_id)
    .eq("is_cover", true);
  if (clearError) return failure("Changing the cover photo failed", clearError);
  const { error } = await session.supabase.from("vibe_photos").update({ is_cover: true }).eq("id", photoId);
  if (error) return failure("Changing the cover photo failed", error);

  refresh(photo.listing_id);
  return { ok: true };
}

export async function submitListingAction(listingId: string): Promise<ActionResult> {
  const owned = await requireListing(listingId);
  if ("failure" in owned) return owned.failure;

  const { error } = await owned.supabase.rpc("submit_vibe_listing", { p_listing_id: listingId });
  if (error) return failure("Submitting the listing failed", error);

  refresh(listingId);
  return { ok: true };
}
