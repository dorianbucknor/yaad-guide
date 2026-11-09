"use client";

import { useNow } from "@/hooks/use-now";
import { formatCountdown } from "@/lib/move/format";
import { cn } from "@/lib/utils";

/** Time left to answer a request; turns urgent under an hour. */
export function Countdown({ respondBy }: { respondBy: string }): React.JSX.Element {
  const now = useNow();
  if (now === 0) return <span className="text-muted-foreground">…</span>;
  const left = new Date(respondBy).getTime() - now;
  return (
    <span className={cn("tabular-nums", left < 3_600_000 ? "font-semibold text-warning-subtle-foreground" : "text-muted-foreground")}>
      {formatCountdown(left)}
    </span>
  );
}
