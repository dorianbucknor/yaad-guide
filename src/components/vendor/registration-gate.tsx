import Link from "next/link";
import { redirect } from "next/navigation";
import { LuLock } from "react-icons/lu";

import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { TabSkeleton, type TabSkeletonKind } from "./tab-skeleton";
import { getVendorOverview } from "@/lib/vendor/queries";

/**
 * Wraps a vendor page that only works for approved vendors. Everyone else sees why,
 * and a button to the Business tab instead of a page that fails.
 */
export async function RegistrationGate({
  feature,
  skeleton,
  children,
}: {
  /** The shape of the page behind the message. */
  skeleton: TabSkeletonKind;
  /** What the page is for, in a few words: "your requests", "your calendar". */
  feature: string;
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const overview = await getVendorOverview();
  if (!overview) redirect("/auth/sign-in?next=%2Fv");
  const status = overview.profile?.status;
  if (status === "approved") return <>{children}</>;

  const underReview = status === "pending";
  return (
    <div className="relative">
      <div aria-hidden inert className="select-none opacity-60">
        <TabSkeleton kind={skeleton} />
      </div>
      <div className="absolute inset-x-0 top-6 flex justify-center px-2 md:top-12">
        <Empty className="max-w-md flex-none border bg-card shadow-lg">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LuLock aria-hidden />
            </EmptyMedia>
            <EmptyTitle>
              {underReview
                ? "Your registration is under review"
                : "Complete registration to access"}
            </EmptyTitle>
            <EmptyDescription>
              {underReview
                ? `An admin is checking your documents. You can open ${feature} as soon as they approve you.`
                : `Finish your business details, vehicles and documents, then send them for review. You can open ${feature} once an admin approves you.`}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/v/move/profile" className={buttonVariants()}>
              {underReview ? "View your registration" : "Continue registration"}
            </Link>
          </EmptyContent>
        </Empty>
      </div>
    </div>
  );
}
