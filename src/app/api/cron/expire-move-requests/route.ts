import { isCronAuthorized } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Every ten minutes (Cloudflare Worker cron, see cloudflare/cron-worker): marks pending MOVE requests past their deadline as expired. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("Expiry refused: CRON_SECRET is not set");
    return Response.json({ error: "Not configured" }, { status: 500 });
  }
  if (!isCronAuthorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await createAdminClient().rpc("expire_move_requests");
    if (error) throw new Error(error.message);
    return Response.json({ expired: data ?? 0 });
  } catch (error) {
    console.error(`Expiring requests failed: ${error instanceof Error ? error.message : String(error)}`);
    return Response.json({ error: "Expiry failed" }, { status: 500 });
  }
}
