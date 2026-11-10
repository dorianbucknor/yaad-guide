import { ChevronRightIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { VibeEntity } from "@/lib/vibe/entities";
import { entityHref } from "@/lib/vibe/entity-view";
import type { VendorStatus } from "@/lib/vendor/types";

const STATUS_LABEL: Record<VendorStatus, string> = {
  draft: "Draft",
  pending: "Under review",
  approved: "Approved",
  rejected: "Changes needed",
};

/**
 * The vendor's businesses, each linking to `base` for that business, with a way to add another.
 * Each business has its own documents and its own admin review.
 */
export function EntityCards({
  entities,
  base,
  heading = "Your businesses",
}: {
  entities: readonly VibeEntity[];
  /** The page each card opens, such as `/v/vibe/profile`. */
  base: string;
  heading?: string;
}): React.JSX.Element {
  return (
    <section aria-labelledby="entities-heading" className="flex flex-col gap-4">
      <h2 id="entities-heading" className="text-xl font-semibold">
        {heading}
      </h2>
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {entities.map((entity) => (
          <li key={entity.id}>
            <Link
              href={entityHref(base, entities.length, entity.id)}
              className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 hover:bg-muted/50"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{entity.businessName ?? "Unnamed business"}</span>
                <span className="text-sm text-muted-foreground">{entity.primaryRegion}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Badge variant={entity.status === "approved" ? "default" : "outline"}>{STATUS_LABEL[entity.status]}</Badge>
                <ChevronRightIcon aria-hidden className="size-4 text-muted-foreground" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div>
        <Link href="/v/vibe/onboarding?new=1" className={buttonVariants({ variant: "outline" })}>
          <PlusIcon aria-hidden /> Add a business
        </Link>
      </div>
    </section>
  );
}
