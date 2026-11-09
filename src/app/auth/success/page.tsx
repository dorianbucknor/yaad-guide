import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { RedirectNotice } from "@/components/auth/redirect-notice";
import { dashboardFor } from "@/lib/auth/dashboard";
import { safeNextPath } from "@/lib/auth/next-path";
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Welcome | YaadGuide",
};

type Kind = "confirmed" | "signed-in";

async function Content({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; next?: string }>;
}): Promise<React.JSX.Element> {
  const { kind: rawKind, next } = await searchParams;
  const kind: Kind = rawKind === "confirmed" ? "confirmed" : "signed-in";

  // Reading the session checks token expiry against the clock, so wait for a request first.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const { role } = getViewer(data?.claims ?? null);

  // A page that was asked for wins; otherwise the person's own dashboard.
  const to = safeNextPath(next, dashboardFor(role));
  const vendor = role === "vendor" || to === "/v" || to.startsWith("/v/") || to.startsWith("/auth/vendor");
  const where = vendor ? "your vendor dashboard" : role === "admin" ? "the admin dashboard" : "YaadGuide";

  return (
    <RedirectNotice
      to={to}
      title={kind === "confirmed" ? "Email confirmed" : "You're signed in"}
      body={`${kind === "confirmed" ? "Thanks for confirming. " : "Welcome back. "}Taking you to ${where}.`}
      label="Continue now"
    />
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; next?: string }>;
}): React.JSX.Element {
  return (
    <Suspense fallback={<main className="min-h-dvh" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
