import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A way back to the list a page was opened from. Sits above the page heading. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <Link href={href} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 self-start")}>
      <ArrowLeftIcon aria-hidden /> {children}
    </Link>
  );
}
