import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { RestorePanel } from "@/components/auth/restore-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { formatUntil, purgeDate } from "@/lib/settings/archive";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Restore your account | YaadGuide",
};

async function RestoreStep(): Promise<React.JSX.Element> {
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/auth/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_status, archived_at")
    .eq("id", auth.user.id)
    .maybeSingle();
  // Nothing to restore for an account that is not archived.
  if (profile?.profile_status !== "archived") redirect("/");

  const until = profile.archived_at ? formatUntil(purgeDate(profile.archived_at)) : null;
  return <RestorePanel until={until} />;
}

export default function Page(): React.JSX.Element {
  return (
    <AuthShell>
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <RestoreStep />
      </Suspense>
    </AuthShell>
  );
}
