"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DashboardRequest, RequestStatus } from "@/lib/move/dashboard";
import { formatMoney, STATUS_LABEL } from "@/lib/move/format";
import { cn } from "@/lib/utils";

import { Countdown } from "./countdown";
import { RequestActions } from "./request-actions";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
  { key: "expired", label: "Expired" },
] as const;

const CHIP: Record<RequestStatus, string> = {
  pending: "bg-warning-subtle text-warning-subtle-foreground",
  accepted: "bg-success-subtle text-success-subtle-foreground",
  completed: "bg-success-subtle text-success-subtle-foreground",
  declined: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
  expired: "bg-destructive-subtle text-destructive-subtle-foreground",
};

const pickup = (iso: string) =>
  new Date(iso).toLocaleString("en-JM", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Jamaica" });

export function RequestsTable({
  requests,
  activePlaceId,
  limit,
}: {
  requests: DashboardRequest[];
  activePlaceId: string | null;
  limit?: number;
}): React.JSX.Element {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  const rows = useMemo(() => {
    const shown = requests.filter((r) => filter === "all" || r.status === filter);
    // Open requests first, soonest deadline on top; the rest newest pickup first.
    const sorted = [...shown].sort((a, b) =>
      a.status === "pending" && b.status === "pending"
        ? a.respondBy.localeCompare(b.respondBy)
        : a.status === "pending"
          ? -1
          : b.status === "pending"
            ? 1
            : b.pickupAt.localeCompare(a.pickupAt),
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }, [requests, filter, limit]);

  return (
    <section aria-labelledby="requests-heading" className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 md:p-6">
      <h2 id="requests-heading" className="text-lg font-semibold">
        Requests
      </h2>
      <div role="group" aria-label="Filter requests" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "min-h-11 rounded-full px-4 text-sm font-medium md:min-h-9",
              filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">
          {filter === "all" ? "No requests yet. When a traveler asks for a ride, it shows up here." : `No ${filter} requests.`}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Pickup</TableHead>
              <TableHead>Party</TableHead>
              <TableHead className="text-right">Quote</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const highlighted = activePlaceId !== null && (r.pickupId === activePlaceId || r.dropoffId === activePlaceId);
              return (
                <TableRow key={r.id} data-active={highlighted ? true : undefined} className={cn(highlighted && "bg-primary/10")}>
                  <TableCell>
                    <div className="font-medium tabular-nums">R-{r.id.slice(0, 6)}</div>
                    <div className="text-sm text-muted-foreground">{r.travelerFirstName || "Traveler"}</div>
                  </TableCell>
                  <TableCell>
                    {r.pickupName} to {r.dropoffName}
                  </TableCell>
                  <TableCell className="tabular-nums">{pickup(r.pickupAt)}</TableCell>
                  <TableCell className="tabular-nums">{r.partySize}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.amount !== null && r.currency ? formatMoney(r.amount, r.currency) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <Badge className={CHIP[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                      {r.status === "pending" ? <Countdown respondBy={r.respondBy} /> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {r.status === "pending" ? <RequestActions id={r.id} who={r.travelerFirstName || "the traveler"} /> : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
