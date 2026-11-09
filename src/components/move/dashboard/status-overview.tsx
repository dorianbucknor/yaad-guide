import type { DashboardData } from "@/lib/move/dashboard";

const SEGMENTS = [
  { key: "pending", label: "Pending", bar: "bg-secondary" },
  { key: "accepted", label: "Accepted", bar: "bg-primary" },
  { key: "declined", label: "Declined", bar: "bg-muted-foreground" },
  { key: "expired", label: "Expired", bar: "bg-destructive" },
] as const;

/** Segmented bar of the last 30 days of requests, with counts and percentages in text. */
export function StatusOverview({ counts }: { counts: DashboardData["counts"] }): React.JSX.Element {
  const total = SEGMENTS.reduce((sum, s) => sum + counts[s.key], 0);
  return (
    <section aria-labelledby="status-heading" className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="status-heading" className="text-lg font-semibold">
          Requests, last 30 days
        </h2>
        <span className="text-sm text-muted-foreground tabular-nums">{total} total</span>
      </div>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">No requests yet. They show up here as travelers ask.</p>
      ) : (
        <>
          <div role="img" aria-label={SEGMENTS.map((s) => `${counts[s.key]} ${s.label.toLowerCase()}`).join(", ")} className="flex h-4 overflow-hidden rounded-full bg-muted">
            {SEGMENTS.map((s) =>
              counts[s.key] > 0 ? <div key={s.key} className={s.bar} style={{ width: `${(counts[s.key] / total) * 100}%` }} /> : null,
            )}
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {SEGMENTS.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                <span aria-hidden className={`size-3 rounded-full ${s.bar}`} />
                <span>{s.label}</span>
                <span className="ml-auto text-muted-foreground tabular-nums">
                  {counts[s.key]} · {Math.round((counts[s.key] / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
