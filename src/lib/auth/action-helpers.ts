import { ARCHIVED_MESSAGE, isArchivedUser } from "@/lib/auth/archived";
import type { FailedResult } from "@/lib/auth/result";
import { createClient } from "@/lib/supabase/server";

export const SIGN_IN_AGAIN = "Please sign in again to continue.";
export const GENERIC = "Something went wrong. Please try again.";
/** Shown when the database refuses a change for lack of permission: says what happened and what to do. */
export const NOT_ALLOWED =
  "Your account doesn't have permission to do this. Sign out and back in, then try again. If it still fails, contact support@yaad-guide.com.";

export type Client = Awaited<ReturnType<typeof createClient>>;

/** The signed-in, non-archived user and their Supabase client, or a failed result. */
export async function requireUser(): Promise<
  { supabase: Client; userId: string } | { failure: FailedResult }
> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { failure: { ok: false, error: SIGN_IN_AGAIN } };
  if (isArchivedUser(data.user)) return { failure: { ok: false, error: ARCHIVED_MESSAGE } };
  return { supabase, userId: data.user.id };
}

/** Our own database functions raise P0001 with a message meant for the user. */
export function failure(context: string, error: { message: string; code?: string }): FailedResult {
  console.error(`${context}: ${error.message}`);
  if (error.code === "P0001") return { ok: false, error: error.message };
  if (error.code === "42501") return { ok: false, error: NOT_ALLOWED };
  if (error.code === "P0002") return { ok: false, error: "We couldn't find that." };
  return { ok: false, error: GENERIC };
}
