"use server";

import { phoneNumberSchema, phoneVerifySchema } from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase/server";

import { toAuthMessage } from "./errors";
import { fromZod, type ActionResult } from "./result";

const SIGN_IN_AGAIN = "Please sign in again to continue.";

/** Starts (or restarts) phone verification by sending a code. */
export async function sendPhoneCodeAction(input: unknown): Promise<ActionResult> {
  const parsed = phoneNumberSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  // Verify against the server before a sensitive change.
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: SIGN_IN_AGAIN };

  const { error } = await supabase.auth.updateUser({ phone: parsed.data.phone });
  if (error) return { ok: false, error: toAuthMessage(error) };
  return { ok: true };
}

/** Confirms the code; the profile's phone fields follow via the database trigger. */
export async function verifyPhoneCodeAction(input: unknown): Promise<ActionResult> {
  const parsed = phoneVerifySchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: SIGN_IN_AGAIN };

  const { error } = await supabase.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.code,
    type: "phone_change",
  });
  if (error) return { ok: false, error: toAuthMessage(error) };

  // Refresh so the new `phone` claim reaches the token the proxy reads.
  await supabase.auth.refreshSession();
  return { ok: true };
}
