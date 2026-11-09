import { BadgeCheck, CircleAlert, Clock, PencilLine } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { VendorStatus } from "@/lib/vendor/types";

const COPY: Record<
  VendorStatus,
  { title: string; body: string; tone: string; icon: React.ComponentType<{ className?: string }> }
> = {
  draft: {
    title: "Draft",
    body: "Finish the steps below and submit when everything is in. Nothing is visible to travelers yet.",
    tone: "bg-muted text-foreground",
    icon: PencilLine,
  },
  pending: {
    title: "Under review",
    body: "An admin is checking your documents. You can't change anything until they decide.",
    tone: "bg-info-subtle text-info-subtle-foreground",
    icon: Clock,
  },
  approved: {
    title: "Approved",
    body: "Your profile is approved. You can add vehicles and replace documents; new ones are checked before they go live.",
    tone: "bg-success-subtle text-success-subtle-foreground",
    icon: BadgeCheck,
  },
  rejected: {
    title: "Changes needed",
    body: "An admin sent your profile back. Fix what they mention and submit again.",
    tone: "bg-destructive/10 text-destructive",
    icon: CircleAlert,
  },
};

/** Status carries an icon and words, never colour alone. */
export function StatusBanner({
  status,
  note,
}: {
  status: VendorStatus;
  note?: string | null;
}): React.JSX.Element {
  const { title, body, tone, icon: Icon } = COPY[status];
  return (
    <Alert className={cn("border-transparent p-4", tone)}>
      <Icon aria-hidden="true" />
      <AlertTitle className="text-base font-semibold">{title}</AlertTitle>
      <AlertDescription className="max-w-[65ch] text-current">
        {body}
        {status === "rejected" && note ? <span className="mt-2 block font-medium">Reason: {note}</span> : null}
      </AlertDescription>
    </Alert>
  );
}
