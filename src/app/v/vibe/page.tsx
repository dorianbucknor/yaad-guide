import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/skeleton";
import { SHELL_ICONS } from "@/components/shell/shell-icons";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { VendorPage } from "@/components/vendor/vendor-page";
import { getVibeOverview } from "@/lib/vibe/queries";

export const metadata: Metadata = {
  title: "Vibe | YaadGuide",
};

async function Body(): Promise<React.JSX.Element> {
  const overview = await getVibeOverview();
  if (!overview) redirect("/auth/sign-in?next=%2Fv%2Fvibe");
  const status = overview.profile?.status;
  const Icon = SHELL_ICONS.vibe;

  const copy =
    status === "pending"
      ? { title: "Your profile is under review", body: "An admin is checking your documents. You can still start drafting listings.", cta: "View your profile", href: "/v/vibe/profile" }
      : status === "approved"
        ? { title: "You are approved", body: "Add your events and attractions, then send each listing for review.", cta: "Go to listings", href: "/v/vibe/listings" }
        : { title: "Set up your Vibe profile", body: "Add your business details and documents, then send them to an admin. You can draft listings while you wait.", cta: status ? "Continue setup" : "Start setup", href: "/v/vibe/onboarding" };

  return (
    <Empty className="max-w-xl self-start border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{copy.title}</EmptyTitle>
        <EmptyDescription>{copy.body}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link href={copy.href} className={buttonVariants()}>
          {copy.cta}
        </Link>
      </EmptyContent>
    </Empty>
  );
}

export default function Page(): React.JSX.Element {
  return (
    <VendorPage title="Vibe" description="Your events and attractions.">
      <Suspense fallback={<Skeleton className="h-48 w-full max-w-xl rounded-2xl" aria-busy="true" />}>
        <Body />
      </Suspense>
    </VendorPage>
  );
}
