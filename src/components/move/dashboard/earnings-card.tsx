"use client";

import { useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardData, Money } from "@/lib/move/dashboard";
import { formatMoney } from "@/lib/move/format";

const PERIODS = [
  { key: "last7Days", label: "Week" },
  { key: "last30Days", label: "Month" },
  { key: "last180Days", label: "6 months" },
  { key: "last365Days", label: "Year" },
] as const;

function Lines({ money }: { money: Money }): React.JSX.Element {
  const shown = (["usd", "jmd"] as const).filter((c) => money[c] > 0);
  if (shown.length === 0) return <span className="text-4xl font-semibold tabular-nums">{formatMoney(0, "usd")}</span>;
  return (
    <>
      {shown.map((c) => (
        <span key={c} className="text-4xl font-semibold tabular-nums">
          {formatMoney(money[c], c)}
        </span>
      ))}
    </>
  );
}

export function EarningsCard({ earnings }: { earnings: DashboardData["earnings"] }): React.JSX.Element {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("last30Days");
  const upcoming = (["usd", "jmd"] as const).filter((c) => earnings.upcoming[c] > 0);
  return (
    <section aria-labelledby="earn-heading" className="flex flex-col gap-4 rounded-3xl bg-linear-to-br from-brand to-brand-dark p-5 text-white md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="earn-heading" className="text-lg font-semibold">
          Earnings
        </h2>
        <Tabs value={period} onValueChange={(next) => setPeriod(next as typeof period)}>
          <TabsList className="bg-white/15">
            {PERIODS.map((p) => (
              <TabsTrigger key={p.key} value={p.key} className="text-white data-active:text-foreground">
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <p className="flex flex-wrap items-baseline gap-x-4" aria-live="polite">
        <Lines money={earnings[period]} />
      </p>
      <p className="text-sm text-white/85">
        Accepted and completed trips.{" "}
        {upcoming.length > 0
          ? `Coming up: ${upcoming.map((c) => formatMoney(earnings.upcoming[c], c)).join(" and ")}.`
          : "Nothing booked ahead yet."}
      </p>
    </section>
  );
}
