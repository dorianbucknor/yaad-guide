import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

/** Shared frame for the vendor pages: left-aligned, one column, a way back. */
export function VendorPage({
  title,
  description,
  backHref = "/vendor",
  backLabel = "Vendor home",
  children,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-4 py-10 md:py-16">
      <div className="flex flex-col gap-3">
        <div>
          <Link href={backHref} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {backLabel}
          </Link>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        {description ? (
          <p className="max-w-[65ch] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </main>
  );
}
