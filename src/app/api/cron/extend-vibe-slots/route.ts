import { isCronAuthorized } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Daily (Vercel cron): extends every live VIBE listing's weekly pattern into slots for the next 90 days. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("Slot extension refused: CRON_SECRET is not set");
    return Response.json({ error: "Not configured" }, { status: 500 });
  }
  if (!isCronAuthorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await createAdminClient().rpc("generate_all_vibe_slots");
    if (error) throw new Error(error.message);
    return Response.json({ generated: data ?? 0 });
  } catch (error) {
    console.error(`Extending vibe slots failed: ${error instanceof Error ? error.message : String(error)}`);
    return Response.json({ error: "Slot extension failed" }, { status: 500 });
  }
}
