"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardData } from "@/lib/move/dashboard";
import type { PlaceRow } from "@/lib/move/queries";

import { EarningsCard } from "./earnings-card";
import { PerformanceChart } from "./performance-chart";
import { RequestsTable } from "./requests-table";
import { StatusOverview } from "./status-overview";

const DashboardMap = dynamic(() => import("./dashboard-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" aria-busy="true" />,
});

export function Dashboard({
  data,
  places,
  stepsLeft,
  listingLive,
}: {
  data: DashboardData;
  /** The places this vendor serves. */
  places: PlaceRow[];
  stepsLeft: number;
  listingLive: boolean;
}): React.JSX.Element {
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);

  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const pins = useMemo(() => places.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng })), [places]);
  const routes = useMemo(
    () =>
      data.requests
        .filter((r) => r.status === "pending")
        .flatMap((r) => {
          const a = byId.get(r.pickupId);
          const b = byId.get(r.dropoffId);
          return a && b ? [{ id: r.id, from: [a.lng, a.lat] as [number, number], to: [b.lng, b.lat] as [number, number] }] : [];
        }),
    [data.requests, byId],
  );

  return (
    <div className="flex flex-col gap-6">
      {!listingLive ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary-light p-4 text-secondary-dark">
          <p className="text-sm font-medium">
            {stepsLeft > 0
              ? `Your listing isn't live yet: ${stepsLeft} ${stepsLeft === 1 ? "step" : "steps"} left.`
              : "Your listing is ready. Send it for review to go live."}
          </p>
          <Link href="/vendor/listing" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Open your listing
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="relative h-72 overflow-hidden rounded-3xl bg-brand-dark md:h-96 lg:col-span-2 lg:h-auto lg:min-h-96">
          {pins.length === 0 ? (
            <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/80">
              Choose the places you serve and they appear here.
            </p>
          ) : (
            <DashboardMap pins={pins} routes={routes} activePinId={activePlaceId} onSelect={setActivePlaceId} />
          )}
        </div>
        <div className="flex flex-col gap-6">
          <StatusOverview counts={data.counts} />
          <PerformanceChart series={data.answeredSeries} rate={data.responseRate} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RequestsTable requests={data.requests} activePlaceId={activePlaceId} limit={8} />
          {data.requests.length > 8 ? (
            <Link href="/vendor/requests" className={buttonVariants({ variant: "ghost" }) + " mt-2"}>
              See all requests
            </Link>
          ) : null}
        </div>
        <EarningsCard earnings={data.earnings} />
      </div>
    </div>
  );
}
