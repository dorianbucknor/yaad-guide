"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ARCHIVED_MESSAGE, isArchivedUser } from "@/lib/auth/archived";
import { fromZod, type ActionResult } from "@/lib/auth/result";
import {
  businessSchema,
  documentMetaSchema,
  transferRequestSchema,
  vehicleSchema,
} from "@/lib/schemas/vendor";
import { createClient } from "@/lib/supabase/server";

import { isOwnDocumentPath } from "./documents";

const SIGN_IN_AGAIN = "Please sign in again to continue.";
const GENERIC = "Something went wrong. Please try again.";
const NEED_BUSINESS = "Save your business details first.";
const BAD_PATH = "That file path is not allowed.";
const DUPLICATE_PLATE =
  "That plate is already registered. If it is your vehicle, request a transfer.";

type Client = Awaited<ReturnType<typeof createClient>>;
type Failure = { ok: false; error: string; fieldErrors?: Record<string, string> };

async function requireUser(): Promise<
  { supabase: Client; userId: string } | { failure: Failure }
> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { failure: { ok: false, error: SIGN_IN_AGAIN } };
  if (isArchivedUser(data.user)) return { failure: { ok: false, error: ARCHIVED_MESSAGE } };
  return { supabase, userId: data.user.id };
}

/** Our own database functions raise P0001 with a message meant for the vendor. */
function failure(context: string, error: { message: string; code?: string }): Failure {
  console.error(`${context}: ${error.message}`);
  if (error.code === "P0001") return { ok: false, error: error.message };
  if (error.code === "42501") return { ok: false, error: "You can't do that." };
  if (error.code === "P0002") return { ok: false, error: "We couldn't find that." };
  return { ok: false, error: GENERIC };
}

async function moveProfileId(supabase: Client, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("vendor_profiles")
    .select("id")
    .eq("account_id", userId)
    .eq("category", "move")
    .maybeSingle();
  return data?.id ?? null;
}

export async function saveBusinessAction(input: unknown): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const { supabase, userId } = session;

  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const business = {
    business_name: parsed.data.businessName?.trim() || null,
    primary_region: parsed.data.primaryRegion,
  };

  const existing = await moveProfileId(supabase, userId);
  const { error } = existing
    ? await supabase.from("vendor_profiles").update(business).eq("id", existing)
    : await supabase
        .from("vendor_profiles")
        .insert({ account_id: userId, category: "move", ...business });
  if (error) return failure("Saving business details failed", error);

  revalidatePath("/vendor");
  return { ok: true };
}

export async function addVehicleAction(input: unknown): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const { supabase, userId } = session;

  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const profileId = await moveProfileId(supabase, userId);
  if (!profileId) return { ok: false, error: NEED_BUSINESS };

  const v = parsed.data;
  const { error } = await supabase.from("vendor_vehicles").insert({
    vendor_profile_id: profileId,
    vehicle_type: v.vehicleType,
    make: v.make,
    model: v.model,
    year: v.year,
    plate: v.plate,
    passenger_capacity: v.passengerCapacity,
  });
  if (error?.code === "23505") {
    return { ok: false, error: DUPLICATE_PLATE, fieldErrors: { plate: DUPLICATE_PLATE } };
  }
  if (error) return failure("Adding a vehicle failed", error);

  revalidatePath("/vendor");
  return { ok: true };
}

export async function removeVehicleAction(vehicleId: string): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  if (!z.uuid().safeParse(vehicleId).success) return { ok: false, error: GENERIC };

  const { error } = await session.supabase.from("vendor_vehicles").delete().eq("id", vehicleId);
  if (error) return failure("Removing a vehicle failed", error);

  revalidatePath("/vendor");
  return { ok: true };
}

/** Records a file the browser already uploaded to the user's own folder. */
export async function recordDocumentAction(input: unknown): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const { supabase, userId } = session;

  const parsed = documentMetaSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { docType, vehicleId, expiresOn, path } = parsed.data;

  if (!isOwnDocumentPath(path, userId)) return { ok: false, error: BAD_PATH };
  const documentId = path.split("/")[1].replace(/\.[^.]+$/, "");
  if (!z.uuid().safeParse(documentId).success) return { ok: false, error: BAD_PATH };

  let profileId: string | null = null;
  if (docType === "jtb_license") {
    profileId = await moveProfileId(supabase, userId);
    if (!profileId) return { ok: false, error: NEED_BUSINESS };
  }

  let lookup = supabase
    .from("vendor_documents")
    .select("id, storage_path")
    .eq("doc_type", docType);
  lookup =
    docType === "government_id"
      ? lookup.eq("account_id", userId)
      : docType === "jtb_license"
        ? lookup.eq("vendor_profile_id", profileId as string)
        : lookup.eq("vehicle_id", vehicleId as string);
  const { data: existing } = await lookup.maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("vendor_documents")
      .update({ storage_path: path, expires_on: expiresOn ?? null })
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
      vehicle_id: docType === "insurance" || docType === "fitness" ? vehicleId : null,
      doc_type: docType,
      storage_path: path,
      expires_on: expiresOn ?? null,
    });
    if (error) return failure("Recording a document failed", error);
  }

  revalidatePath("/vendor");
  return { ok: true };
}

export async function submitProfileAction(): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  const { supabase, userId } = session;

  const profileId = await moveProfileId(supabase, userId);
  if (!profileId) return { ok: false, error: NEED_BUSINESS };

  const { error } = await supabase.rpc("submit_vendor_profile", { p_profile_id: profileId });
  if (error) return failure("Submitting the profile failed", error);

  revalidatePath("/vendor");
  return { ok: true };
}

export async function setActiveVehicleAction(vehicleId: string): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  if (!z.uuid().safeParse(vehicleId).success) return { ok: false, error: GENERIC };

  const { error } = await session.supabase.rpc("set_active_vehicle", { p_vehicle_id: vehicleId });
  if (error) return failure("Activating a vehicle failed", error);

  revalidatePath("/vendor");
  return { ok: true };
}

export async function requestTransferAction(input: unknown): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;

  const parsed = transferRequestSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await session.supabase.rpc("request_vehicle_transfer", {
    p_plate: parsed.data.plate,
  });
  if (error) return failure("Requesting a transfer failed", error);

  revalidatePath("/vendor");
  return { ok: true };
}

export async function respondTransferAction(
  transferId: string,
  agree: boolean,
): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  if (!z.uuid().safeParse(transferId).success) return { ok: false, error: GENERIC };

  const { error } = await session.supabase.rpc("respond_vehicle_transfer", {
    p_transfer_id: transferId,
    p_agree: agree,
  });
  if (error) return failure("Answering a transfer failed", error);

  revalidatePath("/vendor");
  return { ok: true };
}

export async function withdrawTransferAction(transferId: string): Promise<ActionResult> {
  const session = await requireUser();
  if ("failure" in session) return session.failure;
  if (!z.uuid().safeParse(transferId).success) return { ok: false, error: GENERIC };

  const { error } = await session.supabase.rpc("withdraw_vehicle_transfer", {
    p_transfer_id: transferId,
  });
  if (error) return failure("Withdrawing a transfer failed", error);

  revalidatePath("/vendor");
  return { ok: true };
}
