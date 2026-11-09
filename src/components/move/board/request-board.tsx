"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNow } from "@/hooks/use-now";
import type { DashboardRequest, RequestStatus } from "@/lib/move/dashboard";
import { formatCountdown, formatMoney, formatTimeUntil, STATUS_LABEL } from "@/lib/move/format";
import { toJamaica } from "@/lib/move/time";
import { cn } from "@/lib/utils";

import { RequestActions } from "../dashboard/request-actions";
import { RouteLine } from "./route-line";

/** Under this much time left, a request is urgent. */
const URGENT_MS = 2 * 3_600_000;

type TabKey = "needs" | "upcoming" | "history";

const EMPTY: Record<TabKey, string> = {
  needs: "You're all caught up. New requests appear here, soonest deadline first.",
  upcoming: "No trips booked ahead. Accepted requests appear here in pickup order.",
  history: "Nothing here yet. Answered and expired requests collect here.",
};

const STATUS_BADGE: Record<RequestStatus, string> = {
  pending: "bg-muted text-foreground",
  accepted: "bg-success-subtle text-success-subtle-foreground",
  completed: "bg-success-subtle text-success-subtle-foreground",
  declined: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
  expired: "bg-destructive-subtle text-destructive-subtle-foreground",
};

function whenLabel(iso: string, nowMs: number): string {
  const date = new Date(iso);
  const day = toJamaica(date).day;
  const today = toJamaica(new Date(nowMs)).day;
  const tomorrow = toJamaica(new Date(nowMs + 86_400_000)).day;
  const time = date.toLocaleTimeString("en-JM", { hour: "numeric", minute: "2-digit", timeZone: "America/Jamaica" });
  if (day === today) return `Today, ${time}`;
  if (day === tomorrow) return `Tomorrow, ${time}`;
  const label = date.toLocaleDateString("en-JM", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Jamaica" });
  return `${label}, ${time}`;
}

/** Time left to answer. Yellow means it needs you now. */
function Deadline({ respondBy }: { respondBy: string }): React.JSX.Element {
  const now = useNow(15_000);
  if (now === 0) return <Badge variant="outline" className="h-7 w-24" aria-hidden />;
  const left = new Date(respondBy).getTime() - now;
  return (
    <Badge variant={left < URGENT_MS ? "secondary" : "outline"} className="h-7 px-3 text-sm font-semibold tabular-nums">
      {formatCountdown(left)}
    </Badge>
  );
}

/** How long until the pickup, for trips under a week away. Red inside a day. */
function PickupIn({ pickupAt }: { pickupAt: string }): React.JSX.Element | null {
  const now = useNow(30_000);
  if (now === 0) return null;
  const ms = new Date(pickupAt).getTime() - now;
  const text = formatTimeUntil(ms);
  if (!text) return null;
  return (
    <Badge variant={ms < 86_400_000 ? "destructive" : "outline"} className="h-6 px-2.5 tabular-nums">
      {text}
    </Badge>
  );
}

function BoardRow({ r, nowMs, highlighted }: { r: DashboardRequest; nowMs: number; highlighted: boolean }): React.JSX.Element {
  const who = r.travelerFirstName || "Traveler";
  const quote = r.amount !== null && r.currency ? formatMoney(r.amount, r.currency) : "Quote on request";
  return (
    <li
      className={cn(
        "grid gap-x-4 gap-y-2 px-4 py-4 md:grid-cols-[8rem_minmax(0,1fr)_6rem_auto] md:items-center",
        highlighted && "bg-brand-light/40 dark:bg-primary/15",
      )}
    >
      <div className="flex items-center justify-between gap-3 md:flex-col md:items-start md:justify-center md:gap-1">
        {r.status === "pending" ? (
          <Deadline respondBy={r.respondBy} />
        ) : (
          <Badge className={STATUS_BADGE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
        )}
        <span className="text-sm text-muted-foreground tabular-nums">{whenLabel(r.pickupAt, nowMs)}</span>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <RouteLine from={r.pickupName} to={r.dropoffName} className="text-base" />
        <p className="text-sm text-muted-foreground">
          {who} · {r.partySize} {r.partySize === 1 ? "passenger" : "passengers"} · <span className="tabular-nums">{quote}</span>
        </p>
      </div>
      <div className="md:justify-self-start">
        {r.status === "pending" || r.status === "accepted" ? <PickupIn pickupAt={r.pickupAt} /> : null}
      </div>
      {r.status === "pending" ? (
        <div className="md:justify-self-end">
          <RequestActions id={r.id} who={who} />
        </div>
      ) : null}
    </li>
  );
}

/**
 * The requests board: rows ranked by time, in three views. "Needs you" is what expires
 * soonest, "Coming up" the accepted trips in pickup order, "History" everything else.
 */
export function RequestBoard({
  requests,
  nowMs,
  activePlaceId = null,
  historyLimit,
}: {
  requests: DashboardRequest[];
  /** Server time, so the first render matches on both sides. */
  nowMs: number;
  activePlaceId?: string | null;
  historyLimit?: number;
}): React.JSX.Element {
  const groups = useMemo(() => {
    const needs = requests.filter((r) => r.status === "pending").sort((a, b) => a.respondBy.localeCompare(b.respondBy));
    const upcoming = requests
      .filter((r) => r.status === "accepted" && new Date(r.pickupAt).getTime() >= nowMs)
      .sort((a, b) => a.pickupAt.localeCompare(b.pickupAt));
    const shown = new Set([...needs, ...upcoming].map((r) => r.id));
    const history = requests.filter((r) => !shown.has(r.id)).sort((a, b) => b.pickupAt.localeCompare(a.pickupAt));
    return { needs, upcoming, history: historyLimit ? history.slice(0, historyLimit) : history };
  }, [requests, nowMs, historyLimit]);

  const [tab, setTab] = useState<TabKey>(groups.needs.length > 0 ? "needs" : "upcoming");

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "needs", label: "Needs you", count: groups.needs.length },
    { key: "upcoming", label: "Coming up", count: groups.upcoming.length },
    { key: "history", label: "History", count: groups.history.length },
  ];

  return (
    <section aria-labelledby="board-heading" className="overflow-hidden rounded-2xl border border-border bg-card">
      <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <h2 id="board-heading" className="text-lg font-semibold">
            Requests
          </h2>
          <TabsList className="w-full md:w-auto">
            {tabs.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="min-h-11 flex-1 gap-1.5 px-2 md:min-h-8 md:flex-none md:gap-2 md:px-3">
                {t.label}
                <Badge
                  variant={t.key === "needs" && t.count > 0 ? "secondary" : "outline"}
                  className="min-w-5 px-1.5 font-semibold tabular-nums"
                >
                  {t.count}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {tabs.map((t) => (
          <TabsContent key={t.key} value={t.key}>
            {groups[t.key].length === 0 ? (
              <Empty className="rounded-none">
                <EmptyDescription>{EMPTY[t.key]}</EmptyDescription>
              </Empty>
            ) : (
              <ol className="divide-y divide-border">
                {groups[t.key].map((r) => (
                  <BoardRow
                    key={r.id}
                    r={r}
                    nowMs={nowMs}
                    highlighted={activePlaceId !== null && (r.pickupId === activePlaceId || r.dropoffId === activePlaceId)}
                  />
                ))}
              </ol>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
