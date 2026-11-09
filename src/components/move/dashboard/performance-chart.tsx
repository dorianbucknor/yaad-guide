import type { DashboardData } from "@/lib/move/dashboard";

const weekday = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-JM", { weekday: "narrow", timeZone: "UTC" });

/** 14 bars: the share of each day's requests answered in time. Plain CSS, no chart library. */
export function PerformanceChart({
  series,
  rate,
}: {
  series: DashboardData["answeredSeries"];
  rate: number | null;
}): React.JSX.Element {
  const summary = series
    .map((d) => `${d.day}: ${d.received === 0 ? "no requests" : `${d.inTime} of ${d.received} answered in time`}`)
    .join("; ");
  return (
    <section aria-labelledby="perf-heading" className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="perf-heading" className="text-lg font-semibold">
          Answered in time
        </h2>
        <span className="text-sm tabular-nums">
          {rate === null ? (
            <span className="text-muted-foreground">Response rate shows after 5 requests</span>
          ) : (
            <>
              <span className="text-2xl font-semibold">{Math.round(rate * 100)}%</span>{" "}
              <span className="text-muted-foreground">over 90 days</span>
            </>
          )}
        </span>
      </div>
      <div role="img" aria-label={`Last 14 days. ${summary}`} className="flex h-28 items-end gap-1.5">
        {series.map((d) => {
          const share = d.received === 0 ? 0 : d.inTime / d.received;
          return (
            <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div
                className={d.received === 0 ? "w-full rounded-sm bg-muted" : "w-full rounded-sm bg-primary"}
                style={{ height: d.received === 0 ? "4px" : `${Math.max(share * 100, 6)}%` }}
              />
              <span aria-hidden className="text-[10px] text-muted-foreground">
                {weekday(d.day)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
