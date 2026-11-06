import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { PhoneForm } from "@/components/auth/phone-form";
import { WithNext } from "@/components/auth/with-next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Verify your phone | YaadGuide",
};

async function PhoneStep({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}): Promise<React.JSX.Element> {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const pending = (data?.claims?.user_metadata as Record<string, unknown> | undefined)
    ?.pending_phone;

  return (
    <WithNext searchParams={searchParams}>
      {(next) => (
        <PhoneForm
          next={next}
          initialPhone={typeof pending === "string" ? pending : ""}
        />
      )}
    </WithNext>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}): React.JSX.Element {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <PhoneStep searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
