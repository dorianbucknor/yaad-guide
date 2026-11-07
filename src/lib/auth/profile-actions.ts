"use server";

import { revalidatePath } from "next/cache";

import { profileSchema } from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase/server";

import { isOwnAvatarPath } from "./avatar";
import { fromZod, type ActionResult } from "./result";

const SIGN_IN_AGAIN = "Please sign in again to continue.";
const SAVE_FAILED = "We could not save your changes. Please try again.";

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: SIGN_IN_AGAIN };

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
    })
    .eq("id", data.user.id);
  if (error) {
    console.error(`Profile update failed: ${error.message}`);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/settings/personal");
  return { ok: true };
}

/** Stores (or clears, with null) the path of an already-uploaded avatar. */
export async function updateProfilePhotoAction(
  path: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: SIGN_IN_AGAIN };
  if (path !== null && !isOwnAvatarPath(path, data.user.id)) {
    return { ok: false, error: "That photo path is not allowed." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ profile_photo_link: path })
    .eq("id", data.user.id);
  if (error) {
    console.error(`Profile photo update failed: ${error.message}`);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/settings/personal");
  return { ok: true };
}
