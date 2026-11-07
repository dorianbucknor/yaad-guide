"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { ARCHIVED_MESSAGE, isArchivedUser } from "@/lib/auth/archived";
import { toAuthMessage } from "@/lib/auth/errors";
import { fromZod, type ActionResult } from "@/lib/auth/result";
import {
  changeEmailSchema,
  changePasswordSchema,
  deleteAccountSchema,
  preferenceSchema,
} from "@/lib/schemas/settings";
import { createClient } from "@/lib/supabase/server";

import { purgeDate } from "./archive";
import { isLocked } from "./notifications";

const SIGN_IN_AGAIN = "Please sign in again to continue.";
const GENERIC = "Something went wrong. Please try again.";

type Client = Awaited<ReturnType<typeof createClient>>;
type SessionUser = { id: string; email: string | null; hasPassword: boolean };
type Failure = { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Verifies the user with the server (not just the token). */
async function requireUser(
  allowArchived = false,
): Promise<{ supabase: Client; user: SessionUser } | { failure: Failure }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { failure: { ok: false, error: SIGN_IN_AGAIN } };
  // Server actions are routed by id, not path, so the proxy cannot stop them.
  if (!allowArchived && isArchivedUser(data.user)) {
    return { failure: { ok: false, error: ARCHIVED_MESSAGE } };
  }
  return {
    supabase,
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
      hasPassword: (data.user.identities ?? []).some((i) => i.provider === "email"),
    },
  };
}

function failure(context: string, error: { message: string; code?: string }): Failure {
  console.error(`${context}: ${error.message}`);
  if (error.code === "P0001") return { ok: false, error: error.message };
  return { ok: false, error: GENERIC };
}

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Checks a password by signing in with it; null means it is right. */
async function checkPassword(
  supabase: Client,
  email: string | null,
  password: string | undefined,
  field: "currentPassword" | "password",
  wrong: string,
): Promise<Failure | null> {
  if (!email || !password) {
    return {
      ok: false,
      error: "Please check the highlighted fields.",
      fieldErrors: { [field]: field === "password" ? "Enter your password." : "Enter your current password." },
    };
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) return null;
  if (error.code === "invalid_credentials") {
    return {
      ok: false,
      error: "Please check the highlighted fields.",
      fieldErrors: { [field]: wrong },
    };
  }
  return { ok: false, error: toAuthMessage(error) };
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const { supabase, user } = session;

  if (user.hasPassword) {
    const wrong = await checkPassword(
      supabase,
      user.email,
      parsed.data.currentPassword,
      "currentPassword",
      "Current password is incorrect.",
    );
    if (wrong) return wrong;
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) return { ok: false, error: toAuthMessage(error) };
  await supabase.auth.signOut({ scope: "others" });
  return { ok: true };
}

export async function changeEmailAction(input: unknown): Promise<ActionResult> {
  const parsed = changeEmailSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const session = await requireUser();
  if ("failure" in session) return session.failure;

  const origin = await getOrigin();
  const { error } = await session.supabase.auth.updateUser(
    { email: parsed.data.email },
    { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent("/settings/security")}` },
  );
  if (error) return { ok: false, error: toAuthMessage(error) };
  revalidatePath("/settings/security");
  return { ok: true };
}

export async function signOutOthersAction(): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const { error } = await session.supabase.auth.signOut({ scope: "others" });
  if (error) return { ok: false, error: toAuthMessage(error) };
  return { ok: true };
}

export async function archiveAccountAction(
  input: unknown,
): Promise<ActionResult<{ until: string }>> {
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const { supabase, user } = session;

  if (user.hasPassword) {
    const wrong = await checkPassword(
      supabase,
      user.email,
      parsed.data.password,
      "password",
      "Password is incorrect.",
    );
    if (wrong) return wrong;
  }

  const { error } = await supabase.rpc("archive_account");
  if (error) return failure("Archiving the account failed", error);

  await supabase.auth.signOut({ scope: "global" });
  return { ok: true, data: { until: purgeDate(new Date().toISOString()) } };
}

export async function restoreAccountAction(): Promise<ActionResult> {
  const session = await requireUser(true);
  if ("failure" in session) return session.failure;

  const { error } = await session.supabase.rpc("restore_account");
  if (error) return failure("Restoring the account failed", error);

  // Pull a fresh token so the archived flag clears.
  await session.supabase.auth.refreshSession();
  return { ok: true };
}

export async function keepDeletingAction(): Promise<ActionResult> {
  const session = await requireUser(true);
  if ("failure" in session) return session.failure;
  await session.supabase.auth.signOut({ scope: "global" });
  return { ok: true };
}

export async function savePreferenceAction(input: unknown): Promise<ActionResult> {
  const parsed = preferenceSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { category, channel, enabled } = parsed.data;
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const { supabase, user } = session;

  if (isLocked(category, channel) && !enabled) {
    return { ok: false, error: "Security emails can't be turned off." };
  }

  if (channel === "sms" && enabled) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone_verified_at")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.phone_verified_at) {
      return { ok: false, error: "Verify your phone to turn on text messages." };
    }
  }

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      { account_id: user.id, category, channel, enabled },
      { onConflict: "account_id,category,channel" },
    );
  if (error) return failure("Saving a notification preference failed", error);
  return { ok: true };
}
