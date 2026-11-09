import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { SettingsSkeleton } from "@/components/settings/section";
import { SectionNav } from "@/components/settings/section-nav";
import { AdminShell } from "@/components/shell/admin-shell";
import { VendorShell } from "@/components/shell/vendor-shell";
import { buttonVariants } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Settings | YaadGuide",
};

function SettingsBody({
  children,
  withNav = false,
}: {
  children: React.ReactNode;
  /** Travelers have no rail, so the page carries its own section links. */
  withNav?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex w-full max-w-4xl flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Settings</h1>
      <div className="flex flex-col gap-8 md:flex-row md:gap-12">
        {withNav ? (
          <div className="md:w-52 md:shrink-0">
            <SectionNav />
          </div>
        ) : null}
        <div className="flex w-full max-w-xl min-w-0 flex-col gap-8">{children}</div>
      </div>
    </div>
  );
}

/** Vendors and admins keep their own navigation; travelers get a plain page with a way home. */
async function SettingsFrame({ children }: { children: React.ReactNode }): Promise<React.JSX.Element> {
  // Reading the session checks token expiry against the clock, so wait for a request first.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const { role } = getViewer(data?.claims ?? null);

  if (role === "vendor") {
    return (
      <VendorShell>
        <SettingsBody>{children}</SettingsBody>
      </VendorShell>
    );
  }
  if (role === "admin") {
    return (
      <AdminShell>
        <SettingsBody>{children}</SettingsBody>
      </AdminShell>
    );
  }
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-6 px-4 py-10 md:py-16">
      <div>
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Back to home
        </Link>
      </div>
      <SettingsBody withNav>{children}</SettingsBody>
    </main>
  );
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-4xl px-4 py-10 md:py-16">
          <SettingsSkeleton />
        </main>
      }
    >
      <SettingsFrame>{children}</SettingsFrame>
    </Suspense>
  );
}
