import { createHash, timingSafeEqual } from "node:crypto";

import { purgeArchivedAccounts, type PurgeClient } from "@/lib/settings/purge";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const sha256 = (value: string) => createHash("sha256").update(value).digest();

function isAuthorized(header: string | null, secret: string): boolean {
  if (!header) return false;
  // Hash both sides so the buffers match in length for the constant-time compare.
  return timingSafeEqual(sha256(header), sha256(`Bearer ${secret}`));
}

/** Daily job (Vercel cron): permanently deletes accounts archived more than seven days ago. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("Purge refused: CRON_SECRET is not set");
    return Response.json({ error: "Not configured" }, { status: 500 });
  }
  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = createAdminClient() as unknown as PurgeClient;
    const result = await purgeArchivedAccounts(client);
    return Response.json({ purged: result.purged.length, failed: result.failed.length });
  } catch (error) {
    console.error(`Purge failed: ${error instanceof Error ? error.message : String(error)}`);
    return Response.json({ error: "Purge failed" }, { status: 500 });
  }
}
