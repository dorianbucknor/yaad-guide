import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { sortPending } from "./queue";
import type { TransferStatus, VendorDocument, VendorStatus, VendorVehicle } from "./types";

export type QueueProfile = {
  id: string;
  accountId: string;
  businessName: string | null;
  primaryRegion: string;
  submittedAt: string;
  ownerName: string;
};

export type QueueTransfer = {
  id: string;
  plate: string;
  label: string;
  status: TransferStatus;
};

export type AdminProfileDetail = {
  id: string;
  accountId: string;
  businessName: string | null;
  primaryRegion: string;
  status: VendorStatus;
  reviewNote: string | null;
  submittedAt: string | null;
  owner: { name: string; phone: string | null };
  vehicles: VendorVehicle[];
  documents: VendorDocument[];
};

async function adminClient() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user?.app_metadata?.role !== "admin") return null;
  return supabase;
}

const fullName = (p: { first_name: string; last_name: string } | undefined): string =>
  p ? `${p.first_name} ${p.last_name}`.trim() || "Unnamed" : "Unnamed";

/** Profiles waiting for review (oldest first) and transfers the owner agreed to. */
export async function getAdminQueue(): Promise<{
  profiles: QueueProfile[];
  transfers: QueueTransfer[];
} | null> {
  const supabase = await adminClient();
  if (!supabase) return null;

  const { data: pending } = await supabase
    .from("vendor_profiles")
    .select("id, account_id, business_name, primary_region, submitted_at")
    .eq("status", "pending");
  const accountIds = (pending ?? []).map((p) => p.account_id);
  const { data: owners } = accountIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", accountIds)
    : { data: [] };

  const profiles = sortPending(
    (pending ?? []).map((p) => ({
      id: p.id as string,
      accountId: p.account_id as string,
      businessName: p.business_name as string | null,
      primaryRegion: p.primary_region as string,
      submittedAt: (p.submitted_at ?? "") as string,
      ownerName: fullName(owners?.find((o) => o.id === p.account_id)),
    })),
  );

  const { data: agreed } = await supabase
    .from("vehicle_transfers")
    .select("id, status, vendor_vehicles(plate, make, model)")
    .eq("status", "owner_agreed");
  const transfers = (agreed ?? []).map((t) => {
    const raw = t.vendor_vehicles as unknown;
    const vehicle = (Array.isArray(raw) ? raw[0] : raw) as
      | { plate: string; make: string; model: string }
      | null
      | undefined;
    return {
      id: t.id as string,
      status: t.status as TransferStatus,
      plate: vehicle?.plate ?? "",
      label: vehicle ? `${vehicle.make} ${vehicle.model}` : "Vehicle",
    };
  });

  return { profiles, transfers };
}

export async function getAdminProfile(id: string): Promise<AdminProfileDetail | null> {
  const supabase = await adminClient();
  if (!supabase) return null;

  const { data: profile } = await supabase
    .from("vendor_profiles")
    .select(
      "id, account_id, business_name, primary_region, status, review_note, submitted_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!profile) return null;

  const [{ data: owner }, { data: vehicles }, { data: accountDocs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, phone")
      .eq("id", profile.account_id)
      .maybeSingle(),
    supabase
      .from("vendor_vehicles")
      .select("id, vehicle_type, make, model, year, plate, passenger_capacity, is_active")
      .eq("vendor_profile_id", id)
      .order("created_at"),
    supabase
      .from("vendor_documents")
      .select("id, doc_type, vehicle_id, expires_on, verified, storage_path")
      .or(`account_id.eq.${profile.account_id},vendor_profile_id.eq.${id}`),
  ]);

  const vehicleIds = (vehicles ?? []).map((v) => v.id);
  const { data: vehicleDocs } = vehicleIds.length
    ? await supabase
        .from("vendor_documents")
        .select("id, doc_type, vehicle_id, expires_on, verified, storage_path")
        .in("vehicle_id", vehicleIds)
    : { data: [] };

  const seen = new Set<string>();
  const documents = [...(accountDocs ?? []), ...(vehicleDocs ?? [])]
    .filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)))
    .filter((d) => d.vehicle_id === null || vehicleIds.includes(d.vehicle_id))
    .map((d) => ({
      id: d.id as string,
      docType: d.doc_type as VendorDocument["docType"],
      vehicleId: d.vehicle_id as string | null,
      expiresOn: d.expires_on as string | null,
      verified: d.verified as boolean,
      storagePath: d.storage_path as string,
    }));

  return {
    id: profile.id,
    accountId: profile.account_id,
    businessName: profile.business_name,
    primaryRegion: profile.primary_region,
    status: profile.status as VendorStatus,
    reviewNote: profile.review_note,
    submittedAt: profile.submitted_at,
    owner: {
      name: fullName(owner ?? undefined),
      phone: owner?.phone ?? null,
    },
    vehicles: (vehicles ?? []).map((v) => ({
      id: v.id as string,
      vehicleType: v.vehicle_type as string,
      make: v.make as string,
      model: v.model as string,
      year: v.year as number,
      plate: v.plate as string,
      passengerCapacity: v.passenger_capacity as number,
      isActive: v.is_active as boolean,
    })),
    documents,
  };
}
