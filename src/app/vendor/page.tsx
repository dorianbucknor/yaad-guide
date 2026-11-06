import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Vendor home | YaadGuide",
};

export default function Page(): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Welcome, vendor</h1>
      <p className="text-muted-foreground">
        Your account is ready. Adding your business details and documents is
        coming next.
      </p>
      <Link href="/profile" className={buttonVariants({ variant: "outline" })}>
        Your profile
      </Link>
    </main>
  );
}
