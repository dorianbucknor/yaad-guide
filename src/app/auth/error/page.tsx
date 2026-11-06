import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Something went wrong | YaadGuide",
};

const MESSAGES: Record<string, string> = {
  confirm: "That confirmation link is invalid or has expired.",
  oauth: "We could not complete sign-in with Google. Please try again.",
  vendor: "We could not finish setting up your vendor account. Please try again.",
};
const FALLBACK = "Something went wrong. Please try again.";

async function Message({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}): Promise<React.JSX.Element> {
  const { reason } = await searchParams;
  return (
    <p className="text-muted-foreground">
      {(reason && MESSAGES[reason]) || FALLBACK}
    </p>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <Suspense fallback={<p className="text-muted-foreground">{FALLBACK}</p>}>
        <Message searchParams={searchParams} />
      </Suspense>
      <Link href="/auth/sign-in" className={buttonVariants({ variant: "outline" })}>
        Back to sign in
      </Link>
    </main>
  );
}
