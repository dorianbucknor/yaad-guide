import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { buildDashboard, type DashboardData, type RequestRow } from "./dashboard";
import { DAY_MS } from "./time";
import type { Currency } from "./types";

export type { DashboardData } from "./dashboard";

type Joined = { name: string } | { name: string }[] | null;
const nameOf = (value: Joined) => (Array.isArray(value) ? value[0]?.name : value?.name) ?? "";

/** The signed-in vendor's requests (row security limits them to their own) as dashboard data. */
export async function getDashboard(): Promise<DashboardData> {
  await connection();
  const now = new Date();
  // A year back, for the earnings periods; the response rate and counts use shorter windows.
  const since = new Date(now.getTime() - 365 * DAY_MS).toISOString();

  const supabase = await createClient();
  // Row security also lets a user see requests they made as a traveler (and admins see all),
  // so the vendor's own profile is filtered explicitly.
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth.user
    ? await supabase
        .from("vendor_profiles")
        .select("id")
        .eq("account_id", auth.user.id)
        .eq("category", "move")
        .maybeSingle()
    : { data: null };
  if (!profile) return buildDashboard([], now);

  const { data, error } = await supabase
    .from("move_requests")
    .select(
      "id, status, created_at, respond_by, responded_at, pickup_at, pickup_place_id, dropoff_place_id, party_size, traveler_first_name, quoted_amount, quoted_currency, pickup:places!pickup_place_id(name), dropoff:places!dropoff_place_id(name)",
    )
    .eq("vendor_profile_id", profile.id)
    .or(`created_at.gte.${since},status.in.(pending,accepted)`)
    .order("pickup_at", { ascending: true });
  if (error) throw new Error(`Loading the dashboard failed: ${error.message}`);

  const rows: RequestRow[] = (data ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    createdAt: r.created_at,
    respondBy: r.respond_by,
    respondedAt: r.responded_at,
    pickupAt: r.pickup_at,
    pickupId: r.pickup_place_id,
    dropoffId: r.dropoff_place_id,
    pickupName: nameOf(r.pickup as Joined),
    dropoffName: nameOf(r.dropoff as Joined),
    partySize: r.party_size,
    travelerFirstName: r.traveler_first_name,
    amount: r.quoted_amount === null ? null : Number(r.quoted_amount),
    currency: r.quoted_currency as Currency | null,
  }));
  return buildDashboard(rows, now);
}

/** How many requests are waiting on the signed-in vendor and not yet past their deadline. */
export async function getPendingRequestCount(): Promise<number> {
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return 0;
  const { data: profile } = await supabase
    .from("vendor_profiles")
    .select("id")
    .eq("account_id", auth.user.id)
    .eq("category", "move")
    .maybeSingle();
  if (!profile) return 0;
  const { count } = await supabase
    .from("move_requests")
    .select("id", { count: "exact", head: true })
    .eq("vendor_profile_id", profile.id)
    .eq("status", "pending")
    .gt("respond_by", new Date().toISOString());
  return count ?? 0;
}
