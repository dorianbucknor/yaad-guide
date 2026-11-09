"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { GENERIC, failure, requireUser } from "@/lib/auth/action-helpers";
import { fromZod, type ActionResult } from "@/lib/auth/result";
import { listingReviewSchema } from "@/lib/schemas/move";

/** An admin approves a Vibe listing or sends it back with a note. The database checks the permission. */
export async function reviewVibeListingAction(input: unknown): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const parsed = listingReviewSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await session.supabase.rpc("review_vibe_listing", {
    p_listing_id: parsed.data.listingId,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note || null,
  });
  if (error) return failure("Reviewing a Vibe listing failed", error);

  revalidatePath("/admin/listings");
  return { ok: true };
}

export async function resolveVibeFlagAction(flagId: string): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  if (!z.uuid().safeParse(flagId).success) return { ok: false, error: GENERIC };

  const { error } = await session.supabase.rpc("resolve_vibe_listing_flag", { p_id: flagId });
  if (error) return failure("Resolving a Vibe flag failed", error);

  revalidatePath("/admin/listings");
  return { ok: true };
}
