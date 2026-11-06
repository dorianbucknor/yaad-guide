import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Check your email | YaadGuide",
};

export default function Page(): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Check your email</h1>
      <p className="text-muted-foreground">
        We sent you a link. Open it on this device to continue. If you do not
        see it, check your spam folder.
      </p>
      <Link href="/auth/sign-in" className={buttonVariants({ variant: "outline" })}>
        Back to sign in
      </Link>
    </main>
  );
}
