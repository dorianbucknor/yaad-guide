import { BadgeCheck, CircleAlert, Clock, PencilLine } from "lucide-react";

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
    <section
      aria-labelledby="vendor-status"
      className={cn("flex gap-3 rounded-2xl p-5", tone)}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <h2 id="vendor-status" className="text-lg font-semibold">
          {title}
        </h2>
        <p className="max-w-[65ch] text-sm">{body}</p>
        {status === "rejected" && note ? (
          <p className="mt-2 text-sm font-medium">Reason: {note}</p>
        ) : null}
      </div>
    </section>
  );
}
