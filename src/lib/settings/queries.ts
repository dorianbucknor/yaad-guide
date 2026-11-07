import { connection } from "next/server";

import type { Role } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

export type SettingsOverview = {
  userId: string;
  email: string | null;
  pendingEmail: string | null;
  providers: string[];
  hasPassword: boolean;
  firstName: string;
  lastName: string;
  phone: string | null;
  phoneVerified: boolean;
  photoLink: string | null;
  role: Role;
  preferences: { category: string; channel: string; enabled: boolean }[];
};

const ROLES: readonly Role[] = ["traveler", "vendor", "admin"];

/** Everything the settings pages need, read with the caller's own session. */
export async function getSettingsOverview(): Promise<SettingsOverview | null> {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  const [{ data: profile }, { data: preferences }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, phone, phone_verified_at, profile_photo_link, role")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("notification_preferences").select("category, channel, enabled"),
  ]);

  const providers = (user.identities ?? []).map((i) => i.provider);
  const role = ROLES.find((r) => r === profile?.role) ?? "traveler";

  return {
    userId: user.id,
    email: user.email ?? null,
    pendingEmail: user.new_email ?? null,
    providers,
    hasPassword: providers.includes("email"),
    firstName: profile?.first_name ?? "",
    lastName: profile?.last_name ?? "",
    phone: profile?.phone ?? null,
    phoneVerified: Boolean(profile?.phone_verified_at),
    photoLink: profile?.profile_photo_link ?? null,
    role,
    preferences: preferences ?? [],
  };
}
