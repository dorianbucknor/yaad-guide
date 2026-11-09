"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { GENERIC, failure, requireUser, type Client } from "@/lib/auth/action-helpers";
import { fromZod, type ActionResult } from "@/lib/auth/result";
import { listingReviewSchema, placeSchema, suggestionResolveSchema } from "@/lib/schemas/move";

const FORBIDDEN = "You can't do that.";

async function requirePermission(
  permission: "places.manage",
): Promise<{ supabase: Client } | { failure: Extract<ActionResult, { ok: false }> }> {
  const session = await requireUser();
  if ("failure" in session) return session;
  // Ask the database, which reads the live role rather than the token.
  const { data } = await session.supabase.rpc("authorize", { p_permission: permission });
  if (data !== true) return { failure: { ok: false, error: FORBIDDEN } };
  return { supabase: session.supabase };
}

const slugOf = (name: string): string =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export async function savePlaceAction(input: unknown): Promise<ActionResult> {
  const session = await requirePermission("places.manage");
  if ("failure" in session) return session.failure;
  const parsed = placeSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { id, ...fields } = parsed.data;
  const { error } = id
    ? await session.supabase.from("places").update(fields).eq("id", id)
    : await session.supabase.from("places").insert({ slug: slugOf(fields.name), ...fields });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "A place with that name already exists." };
    return failure("Saving a place failed", error);
  }

  revalidatePath("/admin/places");
  return { ok: true };
}

export async function resolveSuggestionAction(input: unknown): Promise<ActionResult> {
  const session = await requirePermission("places.manage");
  if ("failure" in session) return session.failure;
  const parsed = suggestionResolveSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await session.supabase
    .from("place_suggestions")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);
  if (error) return failure("Resolving a suggestion failed", error);

  revalidatePath("/admin/places");
  return { ok: true };
}

export async function reviewListingAction(input: unknown): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const parsed = listingReviewSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await session.supabase.rpc("review_listing", {
    p_listing_id: parsed.data.listingId,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note || null,
  });
  if (error) return failure("Reviewing a listing failed", error);

  revalidatePath("/admin/listings");
  return { ok: true };
}

export async function resolveFlagAction(flagId: string): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  if (!z.uuid().safeParse(flagId).success) return { ok: false, error: GENERIC };

  const { error } = await session.supabase.rpc("resolve_listing_flag", { p_id: flagId });
  if (error) return failure("Resolving a flag failed", error);

  revalidatePath("/admin/listings");
  return { ok: true };
}

export async function verifyProfilePhotoAction(profileId: string): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  if (!z.uuid().safeParse(profileId).success) return { ok: false, error: GENERIC };

  const { error } = await session.supabase.rpc("verify_profile_photo", { p_profile_id: profileId });
  if (error) return failure("Verifying a profile photo failed", error);

  revalidatePath("/admin/vendors");
  revalidatePath("/admin/listings");
  return { ok: true };
}
