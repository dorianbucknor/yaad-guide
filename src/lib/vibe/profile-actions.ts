"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, requireUser, type Client } from "@/lib/auth/action-helpers";
import { fromZod, type ActionResult } from "@/lib/auth/result";
import { documentMetaSchema } from "@/lib/schemas/vendor";
import { vibeBusinessSchema } from "@/lib/schemas/vibe";
import { isOwnDocumentPath } from "@/lib/vendor/documents";

const NEED_BUSINESS = "Save your business details first.";
const BAD_PATH = "That file path is not allowed.";
const VIBE_DOC_TYPES = ["government_id", "business_registration", "venue_permit"];

async function vibeProfileId(supabase: Client, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("vendor_profiles")
    .select("id")
    .eq("account_id", userId)
    .eq("category", "vibe")
    .maybeSingle();
  return data?.id ?? null;
}

export async function saveVibeBusinessAction(input: unknown): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const parsed = vibeBusinessSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const business = { business_name: parsed.data.businessName, primary_region: parsed.data.primaryRegion };
  const existing = await vibeProfileId(session.supabase, session.userId);
  const { error } = existing
    ? await session.supabase.from("vendor_profiles").update(business).eq("id", existing)
    : await session.supabase
        .from("vendor_profiles")
        .insert({ account_id: session.userId, category: "vibe", ...business });
  if (error) return failure("Saving business details failed", error);

  revalidatePath("/v/vibe");
  return { ok: true };
}

/** Records a file the browser already uploaded to the vendor's own folder. */
export async function recordVibeDocumentAction(input: unknown): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const { supabase, userId } = session;

  const parsed = documentMetaSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { docType, path } = parsed.data;
  if (!VIBE_DOC_TYPES.includes(docType)) return { ok: false, error: "That document isn't needed here." };

  if (!isOwnDocumentPath(path, userId)) return { ok: false, error: BAD_PATH };
  const documentId = path.split("/")[1].replace(/\.[^.]+$/, "");
  if (!z.uuid().safeParse(documentId).success) return { ok: false, error: BAD_PATH };

  let profileId: string | null = null;
  if (docType !== "government_id") {
    profileId = await vibeProfileId(supabase, userId);
    if (!profileId) return { ok: false, error: NEED_BUSINESS };
  }

  const lookup = supabase.from("vendor_documents").select("id, storage_path").eq("doc_type", docType);
  const { data: existing } = await (
    docType === "government_id" ? lookup.eq("account_id", userId) : lookup.eq("vendor_profile_id", profileId as string)
  ).maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("vendor_documents")
      .update({ storage_path: path, expires_on: parsed.data.expiresOn ?? null })
      .eq("id", existing.id);
    if (error) return failure("Replacing a document failed", error);
    if (existing.storage_path !== path) {
      await supabase.storage.from("vendor-documents").remove([existing.storage_path]);
    }
  } else {
    const { error } = await supabase.from("vendor_documents").insert({
      id: documentId,
      account_id: userId,
      vendor_profile_id: profileId,
      doc_type: docType,
      storage_path: path,
      expires_on: parsed.data.expiresOn ?? null,
    });
    if (error) return failure("Recording a document failed", error);
  }

  revalidatePath("/v/vibe");
  return { ok: true };
}

export async function submitVibeProfileAction(): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;

  const profileId = await vibeProfileId(session.supabase, session.userId);
  if (!profileId) return { ok: false, error: NEED_BUSINESS };

  const { error } = await session.supabase.rpc("submit_vendor_profile", { p_profile_id: profileId });
  if (error) return failure("Submitting the profile failed", error);

  revalidatePath("/v/vibe");
  return { ok: true };
}
