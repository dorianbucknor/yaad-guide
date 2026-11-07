import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { buildOverview, type RawOverview } from "./overview";
import type { VendorOverview } from "./types";

/** The signed-in vendor's profile, vehicles, documents and transfers. Dynamic. */
export async function getVendorOverview(): Promise<VendorOverview | null> {
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from("vendor_profiles")
    .select("id, business_name, primary_region, status, review_note, submitted_at")
    .eq("account_id", auth.user.id)
    .eq("category", "move")
    .maybeSingle();

  const [vehicles, documents, transfers] = await Promise.all([
    profile
      ? supabase
          .from("vendor_vehicles")
          .select("id, vehicle_type, make, model, year, plate, passenger_capacity, is_active")
          .eq("vendor_profile_id", profile.id)
          .order("created_at")
      : Promise.resolve({ data: [] }),
    supabase
      .from("vendor_documents")
      .select("id, doc_type, vehicle_id, expires_on, verified, storage_path"),
    supabase
      .from("vehicle_transfers")
      .select("id, status, vehicle_id, requested_by, vendor_vehicles(plate, make, model)")
      .in("status", ["requested", "owner_agreed"]),
  ]);

  const raw = {
    userId: auth.user.id,
    profile,
    vehicles: vehicles.data ?? [],
    documents: documents.data ?? [],
    transfers: transfers.data ?? [],
  } as unknown as RawOverview;

  return buildOverview(raw, new Date().toISOString().slice(0, 10));
}
