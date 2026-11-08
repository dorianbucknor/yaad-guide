import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { KIND_LABEL, type QueueItem, type QueueKind } from "@/lib/admin/queue";
import { cn } from "@/lib/utils";

const KINDS: QueueKind[] = ["vendor", "listing", "flag", "place", "transfer"];
const PLURAL: Record<QueueKind, string> = {
  vendor: "Vendors",
  listing: "Listings",
  flag: "Changes",
  place: "Places",
  transfer: "Transfers",
};

/** "Just now", "5h" or "3d": how long an item has waited. */
export function waitingLabel(since: string | null, nowMs: number): string {
  if (!since) return "";
  const hours = Math.floor((nowMs - new Date(since).getTime()) / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const href = (item: string | null, kind: QueueKind | null): string => {
  const query = new URLSearchParams();
  if (item) query.set("item", item);
  if (kind) query.set("kind", kind);
  const text = query.toString();
  return text ? `/admin?${text}` : "/admin";
};

/** The queue on the left: filter pills, then every waiting item, oldest first. */
export function QueueList({
  items,
  all,
  selectedKey,
  kind,
  nowMs,
}: {
  items: QueueItem[];
  all: QueueItem[];
  selectedKey: string | null;
  kind: QueueKind | null;
  nowMs: number;
}): React.JSX.Element {
  const counts = new Map(KINDS.map((k) => [k, all.filter((i) => i.kind === k).length]));
  const pills: { label: string; kind: QueueKind | null; count: number }[] = [
    { label: "All", kind: null, count: all.length },
    ...KINDS.filter((k) => (counts.get(k) ?? 0) > 0).map((k) => ({ label: PLURAL[k], kind: k, count: counts.get(k) ?? 0 })),
  ];

  return (
    <section aria-labelledby="queue-heading" className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <h2 id="queue-heading" className="text-lg font-semibold">
          Waiting for review <span className="text-muted-foreground tabular-nums">{all.length}</span>
        </h2>
        <nav aria-label="Filter the queue" className="flex flex-wrap gap-2">
          {pills.map((pill) => (
            <Link
              key={pill.label}
              href={href(null, pill.kind)}
              aria-current={pill.kind === kind ? "true" : undefined}
              className={cn(
                buttonVariants({ variant: pill.kind === kind ? "default" : "outline", size: "sm" }),
                "gap-1.5 rounded-full",
              )}
            >
              {pill.label}
              <span className="tabular-nums opacity-80">{pill.count}</span>
            </Link>
          ))}
        </nav>
      </div>
      {items.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          {all.length === 0 ? "Nothing is waiting. New submissions show up here, oldest first." : "Nothing of this kind is waiting."}
        </p>
      ) : (
        <ol className="divide-y divide-border">
          {items.map((i) => {
            const selected = i.key === selectedKey;
            const waited = waitingLabel(i.waitingSince, nowMs);
            const old = i.waitingSince !== null && nowMs - new Date(i.waitingSince).getTime() > 2 * 86_400_000;
            return (
              <li key={i.key}>
                <Link
                  href={href(i.key, kind)}
                  aria-current={selected ? "true" : undefined}
                  className={cn(
                    "flex min-h-16 items-center gap-3 px-4 py-3 outline-none hover:bg-muted focus-visible:bg-muted",
                    selected && "bg-brand-light/50 hover:bg-brand-light/50 dark:bg-primary/20",
                  )}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{i.title}</span>
                    <span className="truncate text-sm text-muted-foreground">{i.subtitle}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant="outline">{KIND_LABEL[i.kind]}</Badge>
                    {waited ? (
                      <span
                        className={cn(
                          "rounded-full px-2 text-xs font-semibold tabular-nums",
                          old ? "bg-secondary text-secondary-foreground" : "text-muted-foreground",
                        )}
                      >
                        {waited}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
