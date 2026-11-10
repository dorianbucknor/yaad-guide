"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, requireUser, type Client } from "@/lib/auth/action-helpers";
import { fromZod, type ActionResult } from "@/lib/auth/result";
import { documentMetaSchema } from "@/lib/schemas/vendor";
import { vibeBusinessSchema } from "@/lib/schemas/vibe";
import { isOwnDocumentPath } from "@/lib/vendor/documents";

import { listMyVibeEntities, pickVibeEntity, resolveVibeEntity } from "./entities";

const NEED_BUSINESS = "Save your business details first.";
const BAD_PATH = "That file path is not allowed.";
const WHICH_BUSINESS = "Choose which business this is for.";
const VIBE_DOC_TYPES = ["government_id", "business_registration", "venue_permit"];

/** The entity's id, or the message saying whether none exists or the caller must choose. */
async function entityIdFor(
  supabase: Client,
  userId: string,
  entityId: string | undefined,
): Promise<{ id: string } | { error: string }> {
  const entities = await listMyVibeEntities(supabase, userId);
  if (entities.length === 0) return { error: NEED_BUSINESS };
  const entity = pickVibeEntity(entities, entityId);
  return entity ? { id: entity.id } : { error: WHICH_BUSINESS };
}

export async function saveVibeBusinessAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const parsed = vibeBusinessSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const business = { business_name: parsed.data.businessName, primary_region: parsed.data.primaryRegion };
  const { entityId } = parsed.data;
  // A new entity gets its id here, so the page can move to it without reading the row back.
  if (entityId) {
    const owned = await resolveVibeEntity(session.supabase, session.userId, entityId);
    if (!owned) return { ok: false, error: "We couldn't find that business." };
  }
  let savedId = entityId;
  let error: { code?: string; message: string } | null;
  if (entityId) {
    ({ error } = await session.supabase.from("vendor_profiles").update(business).eq("id", entityId));
  } else {
    // The id is chosen by the database: clients are not granted insert on it.
    const created = await session.supabase
      .from("vendor_profiles")
      .insert({ account_id: session.userId, category: "vibe", ...business })
      .select("id")
      .single();
    error = created.error;
    savedId = created.data?.id as string | undefined;
  }
  if (error?.code === "23505") return { ok: false, error: "You already have a business with that name." };
  if (error) return failure("Saving business details failed", error);

  revalidatePath("/v/vibe");
  return { ok: true, data: { id: savedId as string } };
}

/** Records a file the browser already uploaded to the vendor's own folder. */
export async function recordVibeDocumentAction(input: unknown): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const { supabase, userId } = session;

  const parsed = documentMetaSchema.extend({ entityId: z.uuid().optional() }).safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { docType, path } = parsed.data;
  if (!VIBE_DOC_TYPES.includes(docType)) return { ok: false, error: "That document isn't needed here." };

  if (!isOwnDocumentPath(path, userId)) return { ok: false, error: BAD_PATH };
  const documentId = path.split("/")[1].replace(/\.[^.]+$/, "");
  if (!z.uuid().safeParse(documentId).success) return { ok: false, error: BAD_PATH };

  let profileId: string | null = null;
  if (docType !== "government_id") {
    const entity = await entityIdFor(supabase, userId, parsed.data.entityId);
    if ("error" in entity) return { ok: false, error: entity.error };
    profileId = entity.id;
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

export async function submitVibeProfileAction(entityId?: string): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;

  const entity = await entityIdFor(session.supabase, session.userId, entityId);
  if ("error" in entity) return { ok: false, error: entity.error };

  const { error } = await session.supabase.rpc("submit_vendor_profile", { p_profile_id: entity.id });
  if (error) return failure("Submitting the profile failed", error);

  revalidatePath("/v/vibe");
  return { ok: true };
}
