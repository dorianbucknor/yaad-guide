import { CheckCircle2Icon, CircleDashedIcon } from "lucide-react";
import Link from "next/link";

import type { VibeReadinessItem } from "@/lib/vibe/readiness";

const STEPS: { item: VibeReadinessItem; label: string; tab: string | null }[] = [
  { item: "profile_approved", label: "Vendor profile approved", tab: null },
  { item: "basics", label: "Description and area", tab: "basics" },
  { item: "tickets", label: "At least one ticket", tab: "tickets" },
  { item: "slots", label: "A date or a weekly schedule", tab: "schedule" },
  { item: "cover_photo", label: "A cover photo", tab: "photos" },
  { item: "address", label: "Street address, town and parish", tab: "location" },
  { item: "pin", label: "A pin on the map", tab: "location" },
];

/** What the listing still needs, each missing item linking to the step that fixes it. */
export function ReadinessCard({
  listingId,
  missing,
}: {
  listingId: string;
  missing: readonly VibeReadinessItem[];
}): React.JSX.Element {
  return (
    <section aria-labelledby="readiness-heading" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 md:p-6">
      <h2 id="readiness-heading" className="text-lg font-semibold">
        {missing.length === 0 ? "Ready to send for review" : `${missing.length} to do before review`}
      </h2>
      <ul className="flex flex-col gap-1">
        {STEPS.map(({ item, label, tab }) => {
          const done = !missing.includes(item);
          const Icon = done ? CheckCircle2Icon : CircleDashedIcon;
          return (
            <li key={item}>
              {done ? (
                <span className="flex min-h-11 items-center gap-3 text-sm text-muted-foreground md:min-h-9">
                  <Icon aria-hidden className="size-5 text-success" />
                  {label}
                  <span className="sr-only"> done</span>
                </span>
              ) : (
                <Link
                  href={tab ? `/v/vibe/listings/${listingId}?tab=${tab}` : "/v/vibe/profile"}
                  className="flex min-h-11 items-center gap-3 rounded-lg text-sm font-medium underline-offset-4 hover:underline md:min-h-9"
                >
                  <Icon aria-hidden className="size-5 text-warning" />
                  {label}
                  <span className="sr-only"> to do</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
