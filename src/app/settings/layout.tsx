import type { Metadata } from "next";
import Link from "next/link";

import { SectionNav } from "@/components/settings/section-nav";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Settings | YaadGuide",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-8 px-4 py-10 md:py-16">
      <div className="flex flex-col gap-3">
        <div>
          <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Home
          </Link>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Settings</h1>
      </div>
      <div className="flex flex-col gap-8 md:flex-row md:gap-12">
        <div className="md:w-52 md:shrink-0">
          <SectionNav />
        </div>
        <div className="flex w-full max-w-xl min-w-0 flex-col gap-8">{children}</div>
      </div>
    </main>
  );
}
