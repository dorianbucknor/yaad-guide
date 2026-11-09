import Link from "next/link";
import { LuTriangleAlert } from "react-icons/lu";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { attentionFor, type AttentionScope } from "@/lib/move/attention";
import { getMyListing } from "@/lib/move/queries";
import { getVendorOverview } from "@/lib/vendor/queries";
import { cn } from "@/lib/utils";

/** A red strip across the top of a tab: what the vendor must handle before travelers can book them. */
export async function MoveAttention({ scope }: { scope: AttentionScope }): Promise<React.JSX.Element | null> {
  const [overview, view] = await Promise.all([getVendorOverview(), getMyListing()]);
  if (!overview) return null;
  const profile = overview.profile;

  const attention = attentionFor(scope, {
    profileStatus: profile?.status ?? null,
    businessName: profile?.businessName ?? null,
    hasProfilePhoto: Boolean(view?.profilePhotoLink),
    listing: view?.listing ? { status: view.listing.status, paused: view.listing.paused } : null,
    missing: view?.readiness.missing ?? [],
  });
  if (!attention) return null;

  return (
    <Alert
      aria-live="polite"
      className="gap-y-0.5 border-transparent bg-destructive px-4 py-3 text-destructive-foreground *:data-[slot=alert-description]:text-destructive-foreground/90"
    >
      <LuTriangleAlert aria-hidden />
      <AlertTitle className="text-base font-semibold">{attention.title}</AlertTitle>
      <AlertDescription>{attention.detail}</AlertDescription>
      <AlertAction>
        <Link href={attention.href} className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
          Fix now
        </Link>
      </AlertAction>
    </Alert>
  );
}
