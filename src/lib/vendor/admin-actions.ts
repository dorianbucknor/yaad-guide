"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fromZod, type ActionResult } from "@/lib/auth/result";
import {
  identityRejectSchema,
  profileReviewSchema,
  transferReviewSchema,
} from "@/lib/schemas/vendor";
import { createClient } from "@/lib/supabase/server";

const FORBIDDEN = "You don't have access to this.";
const GENERIC = "Something went wrong. Please try again.";

type Client = Awaited<ReturnType<typeof createClient>>;
type Failure = { ok: false; error: string; fieldErrors?: Record<string, string> };

type Permission =
  | "vendors.review"
  | "documents.verify"
  | "identity.reject"
  | "transfers.review";

/** Asks the database, which reads the caller's live role, not the token. */
async function requirePermission(
  permission: Permission,
): Promise<{ supabase: Client } | { failure: Failure }> {
  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("authorize", { p_permission: permission });
  if (allowed !== true) return { failure: { ok: false, error: FORBIDDEN } };
  return { supabase };
}

function failure(context: string, error: { message: string; code?: string }): Failure {
  console.error(`${context}: ${error.message}`);
  if (error.code === "P0001") return { ok: false, error: error.message };
  if (error.code === "42501") return { ok: false, error: FORBIDDEN };
  if (error.code === "P0002") return { ok: false, error: "We couldn't find that." };
  return { ok: false, error: GENERIC };
}

export async function reviewProfileAction(input: unknown): Promise<ActionResult> {
  const session = await requirePermission("vendors.review");
  if ("failure" in session) return session.failure;

  const parsed = profileReviewSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await session.supabase.rpc("review_vendor_profile", {
    p_profile_id: parsed.data.profileId,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note || null,
  });
  if (error) return failure("Reviewing a profile failed", error);

  revalidatePath("/admin/vendors");
  return { ok: true };
}

export async function verifyDocumentAction(
  documentId: string,
  verified: boolean,
): Promise<ActionResult> {
  const session = await requirePermission("documents.verify");
  if ("failure" in session) return session.failure;
  if (!z.uuid().safeParse(documentId).success) return { ok: false, error: GENERIC };

  const { error } = await session.supabase.rpc("verify_vendor_document", {
    p_document_id: documentId,
    p_verified: verified,
  });
  if (error) return failure("Verifying a document failed", error);

  revalidatePath("/admin/vendors");
  return { ok: true };
}

export async function rejectIdentityAction(input: unknown): Promise<ActionResult> {
  const session = await requirePermission("identity.reject");
  if ("failure" in session) return session.failure;

  const parsed = identityRejectSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await session.supabase.rpc("reject_account_identity", {
    p_account_id: parsed.data.accountId,
    p_note: parsed.data.note,
  });
  if (error) return failure("Rejecting an identity failed", error);

  revalidatePath("/admin/vendors");
  return { ok: true };
}

/** A 60-second link to one document, created with the admin's own session. */
export async function signedDocumentUrlAction(
  documentId: string,
): Promise<ActionResult<{ url: string }>> {
  const session = await requirePermission("documents.verify");
  if ("failure" in session) return session.failure;
  if (!z.uuid().safeParse(documentId).success) return { ok: false, error: GENERIC };

  const { data: document } = await session.supabase
    .from("vendor_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();
  if (!document) return { ok: false, error: "We couldn't find that document." };

  const { data, error } = await session.supabase.storage
    .from("vendor-documents")
    .createSignedUrl(document.storage_path, 60);
  if (error || !data) {
    console.error(`Signing a document link failed: ${error?.message ?? "no data"}`);
    return { ok: false, error: GENERIC };
  }
  return { ok: true, data: { url: data.signedUrl } };
}

export async function reviewTransferAction(input: unknown): Promise<ActionResult> {
  const session = await requirePermission("transfers.review");
  if ("failure" in session) return session.failure;

  const parsed = transferReviewSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await session.supabase.rpc("review_vehicle_transfer", {
    p_transfer_id: parsed.data.transferId,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note || null,
  });
  if (error) return failure("Reviewing a transfer failed", error);

  revalidatePath("/admin/vendors");
  return { ok: true };
}
