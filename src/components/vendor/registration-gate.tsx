import { redirect } from "next/navigation";

import { SetupPrompt } from "./setup-prompt";
import { TabSkeleton, type TabSkeletonKind } from "./tab-skeleton";
import { getVendorOverview } from "@/lib/vendor/queries";

/**
 * Wraps a vendor page that only works for approved vendors. Everyone else sees a preview of the
 * page behind the same "set up your vendor profile" prompt used everywhere else.
 */
export async function RegistrationGate({
  skeleton,
  children,
}: {
  /** The shape of the page behind the prompt. */
  skeleton: TabSkeletonKind;
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const overview = await getVendorOverview();
  if (!overview) redirect("/auth/sign-in?next=%2Fv");
  const status = overview.profile?.status;
  if (status === "approved") return <>{children}</>;

  return (
    <div className="relative">
      <div aria-hidden inert className="select-none opacity-60">
        <TabSkeleton kind={skeleton} />
      </div>
      <div className="absolute inset-x-0 top-6 flex justify-center px-2 md:top-12">
        <SetupPrompt category="move" status={status} setupHref="/v/move/profile" floating />
      </div>
    </div>
  );
}
