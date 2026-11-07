import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { buttonVariants } from "@/components/ui/button";
import { formatUntil } from "@/lib/settings/archive";

export const metadata: Metadata = {
  title: "Account deleted | YaadGuide",
};

async function ArchivedMessage({
  searchParams,
}: {
  searchParams: Promise<{ until?: string }>;
}): Promise<React.JSX.Element> {
  const { until } = await searchParams;
  const date = formatUntil(until);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Your account is deleted</h1>
        <p className="max-w-[65ch] text-sm text-muted-foreground">
          {date
            ? `It is scheduled for permanent deletion on ${date}. `
            : "It is scheduled for permanent deletion in 7 days. "}
          Sign in before then to restore it.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/auth/sign-in" className={buttonVariants({ className: "min-h-11 md:min-h-8" })}>
          Sign in
        </Link>
        <Link
          href="/"
          className={buttonVariants({ variant: "outline", className: "min-h-11 md:min-h-8" })}
        >
          Home
        </Link>
      </div>
    </div>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ until?: string }>;
}): React.JSX.Element {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <ArchivedMessage searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
