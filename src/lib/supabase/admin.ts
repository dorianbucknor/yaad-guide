// Server only. The service-role (secret) key bypasses row-level security, so
// this module is imported by the purge route and nothing else; a test in
// src/app/api/cron/purge-archived enforces that. `server-only` is not installed.
import { createClient } from "@supabase/supabase-js";

/** Service-role client for the daily purge. Never import this from client code. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url) throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("Missing env SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
