import { Check, Lock } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { ChecklistStep } from "@/lib/vendor/checklist";

const LABEL = { done: "Done", todo: "Next", locked: "Locked" } as const;

/**
 * The onboarding steps are a real sequence, so they hang on a route line: a
 * thin path with a stop for each step.
 */
export function Checklist({
  steps,
  readOnly = false,
}: {
  steps: ChecklistStep[];
  readOnly?: boolean;
}): React.JSX.Element {
  const nextKey = steps.find((s) => s.state === "todo")?.key;

  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const interactive = step.state !== "locked" && !readOnly;
        const body = (
          <div className="flex min-h-11 flex-col gap-0.5 pb-8">
            <span className="flex flex-wrap items-center gap-2 text-base font-medium">
              {step.label}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  step.state === "done" && "bg-success-subtle text-success-subtle-foreground",
                  step.state === "todo" && "bg-primary text-primary-foreground",
                  step.state === "locked" && "bg-muted text-muted-foreground",
                )}
              >
                {LABEL[step.state]}
              </span>
            </span>
            <span className="max-w-[60ch] text-sm text-muted-foreground">{step.hint}</span>
          </div>
        );

        return (
          <li key={step.key} className="relative flex gap-4">
            {!isLast ? (
              <span
                aria-hidden="true"
                className="absolute top-8 bottom-0 left-4 w-0.5 -translate-x-1/2 rounded-full bg-border"
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "z-10 mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border-2",
                step.state === "done" && "border-primary bg-primary text-primary-foreground",
                step.state === "todo" && "border-primary bg-background text-primary",
                step.state === "locked" && "border-border bg-background text-muted-foreground",
              )}
            >
              {step.state === "done" ? (
                <Check className="size-4" />
              ) : step.state === "locked" ? (
                <Lock className="size-3.5" />
              ) : (
                <span className="size-2 rounded-full bg-primary" />
              )}
            </span>
            {interactive ? (
              <Link
                href={step.href}
                aria-current={step.key === nextKey ? "step" : undefined}
                className="flex-1 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {body}
              </Link>
            ) : (
              <div className="flex-1">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
