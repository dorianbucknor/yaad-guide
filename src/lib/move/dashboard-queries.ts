import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { MOVE_CONFIG } from "./config";
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
  const since = new Date(now.getTime() - MOVE_CONFIG.responseRateDays * DAY_MS).toISOString();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("move_requests")
    .select(
      "id, status, created_at, respond_by, responded_at, pickup_at, party_size, traveler_first_name, quoted_amount, quoted_currency, pickup:places!pickup_place_id(name), dropoff:places!dropoff_place_id(name)",
    )
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
    pickupName: nameOf(r.pickup as Joined),
    dropoffName: nameOf(r.dropoff as Joined),
    partySize: r.party_size,
    travelerFirstName: r.traveler_first_name,
    amount: r.quoted_amount === null ? null : Number(r.quoted_amount),
    currency: r.quoted_currency as Currency | null,
  }));
  return buildDashboard(rows, now);
}
