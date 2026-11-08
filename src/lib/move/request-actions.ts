"use server";

import { revalidatePath } from "next/cache";

import { failure, requireUser } from "@/lib/auth/action-helpers";
import { fromZod, type ActionResult } from "@/lib/auth/result";
import { acceptRequestSchema, declineRequestSchema } from "@/lib/schemas/move";

/** Accepting runs in the database: it locks the listing and refuses overlapping trips. */
export async function acceptRequestAction(input: unknown): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const parsed = acceptRequestSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await session.supabase.rpc("accept_move_request", {
    p_id: parsed.data.id,
    p_note: parsed.data.note || null,
  });
  if (error) return failure("Accepting the request failed", error);

  revalidatePath("/vendor");
  return { ok: true };
}

export async function declineRequestAction(input: unknown): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const parsed = declineRequestSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await session.supabase.rpc("decline_move_request", {
    p_id: parsed.data.id,
    p_reason: parsed.data.reason,
  });
  if (error) return failure("Declining the request failed", error);

  revalidatePath("/vendor");
  return { ok: true };
}
