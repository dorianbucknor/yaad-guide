import { CheckCircle2Icon, CircleDashedIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { ReadinessItem } from "@/lib/move/readiness";

const STEPS: { item: ReadinessItem; label: string; href: string }[] = [
  { item: "profile_approved", label: "Business profile approved", href: "/v" },
  { item: "vehicle", label: "An active vehicle", href: "/v" },
  { item: "luggage", label: "Luggage space entered", href: "/v/move/listing?tab=vehicles" },
  { item: "photos", label: "Front, rear, interior and luggage photos", href: "/v/move/listing?tab=vehicles" },
  { item: "profile_photo", label: "Profile photo checked", href: "/profile" },
  { item: "coverage", label: "Places you serve", href: "/v/move/listing?tab=service" },
  { item: "pricing", label: "Flat rates or a formula", href: "/v/move/listing?tab=pricing" },
  { item: "availability", label: "Weekly hours", href: "/v/move/listing?tab=service" },
];

/** What the listing still needs, each missing item linking to the step that fixes it. */
export function ReadinessCard({ missing }: { missing: readonly ReadinessItem[] }): React.JSX.Element {
  return (
    <section aria-labelledby="readiness-heading" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 md:p-6">
      <h2 id="readiness-heading" className="text-lg font-semibold">
        {missing.length === 0 ? "Ready to send for review" : `${missing.length} to do before review`}
      </h2>
      <ul className="flex flex-col gap-1">
        {STEPS.map(({ item, label, href }) => {
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
                  href={href}
                  className={cn("flex min-h-11 items-center gap-3 rounded-lg text-sm font-medium underline-offset-4 hover:underline md:min-h-9")}
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
