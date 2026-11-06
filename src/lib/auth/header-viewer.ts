import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

import { avatarPublicUrl } from "./avatar";
import type { Role } from "./guard";
import { getViewer } from "./viewer";

export type HeaderViewer = {
  firstName: string;
  role: Role;
  photoUrl: string | null;
};

/** The signed-in user for the header, or null for guests. Dynamic: reads cookies. */
export async function getHeaderViewer(): Promise<HeaderViewer | null> {
  let url: string;
  try {
    url = getSupabaseEnv().url;
  } catch {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  const viewer = getViewer(claims ?? null);
  if (!viewer.signedIn || typeof claims?.sub !== "string") return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, profile_photo_link")
    .eq("id", claims.sub)
    .maybeSingle();

  return {
    firstName: profile?.first_name || "Account",
    role: viewer.role,
    photoUrl: avatarPublicUrl(profile?.profile_photo_link, url),
  };
}
