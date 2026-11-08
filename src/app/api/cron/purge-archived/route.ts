import { isCronAuthorized } from "@/lib/cron/auth";
import { purgeArchivedAccounts, type PurgeClient } from "@/lib/settings/purge";
import { createAdminClient } from "@/lib/supabase/admin";

/** Daily job (Vercel cron): permanently deletes accounts archived more than seven days ago. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("Purge refused: CRON_SECRET is not set");
    return Response.json({ error: "Not configured" }, { status: 500 });
  }
  if (!isCronAuthorized(request.headers.get("authorization"), secret)) {
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
