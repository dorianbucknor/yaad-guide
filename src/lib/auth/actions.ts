"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  vendorSignUpSchema,
} from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase/server";

import { toAuthMessage } from "./errors";
import { safeNextPath } from "./next-path";
import { fromZod, type ActionResult } from "./result";

const VENDOR_COMPLETE = "/auth/vendor/complete";

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function confirmUrl(origin: string, next: string): string {
  return `${origin}/auth/confirm?next=${encodeURIComponent(next)}`;
}

export async function signUpAction(
  input: unknown,
  next?: string,
): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { firstName, lastName, email, password } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
      emailRedirectTo: confirmUrl(await getOrigin(), safeNextPath(next)),
    },
  });
  // An already-registered email returns the same success, so nothing leaks.
  if (error) return { ok: false, error: toAuthMessage(error) };
  return { ok: true };
}

export async function vendorSignUpAction(input: unknown): Promise<ActionResult> {
  const parsed = vendorSignUpSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { firstName, lastName, email, password, phone } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // pending_phone only prefills the phone step; it is never trusted.
      data: { first_name: firstName, last_name: lastName, pending_phone: phone },
      emailRedirectTo: confirmUrl(await getOrigin(), VENDOR_COMPLETE),
    },
  });
  if (error) return { ok: false, error: toAuthMessage(error) };
  return { ok: true };
}

export async function signInAction(
  input: unknown,
  next?: string,
): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: toAuthMessage(error) };
  redirect(safeNextPath(next));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: confirmUrl(await getOrigin(), "/auth/reset-password"),
  });
  // Only rate limits are shown; anything else looks like success.
  if (error?.code?.startsWith("over_")) {
    return { ok: false, error: toAuthMessage(error) };
  }
  return { ok: true };
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  // Verify against the server before a sensitive change.
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return {
      ok: false,
      error: "That reset link has expired. Request a new one.",
    };
  }
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: toAuthMessage(error) };
  redirect("/");
}

export async function signInWithGoogleAction(
  next?: string,
  intent?: "vendor",
): Promise<void> {
  const target = intent === "vendor" ? VENDOR_COMPLETE : safeNextPath(next);
  const origin = await getOrigin();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(target)}`,
    },
  });
  if (error || !data.url) {
    console.error(`Google sign-in start failed: ${error?.message ?? "no redirect url"}`);
    redirect("/auth/error?reason=oauth");
  }
  redirect(data.url);
}
