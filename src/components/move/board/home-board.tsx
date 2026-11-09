"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { Skeleton } from "@/components/skeleton";
import type { DashboardData } from "@/lib/move/dashboard";
import type { PlaceRow } from "@/lib/move/queries";

import { EarningsCard } from "../dashboard/earnings-card";
import { PerformanceChart } from "../dashboard/performance-chart";
import { StatusOverview } from "../dashboard/status-overview";
import { ListingStatus } from "./listing-status";
import { RequestBoard } from "./request-board";

const DashboardMap = dynamic(() => import("../dashboard/dashboard-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" aria-busy="true" />,
});

/**
 * The vendor home: the requests board leads. Beside it (below it on a phone) sit the listing
 * switch, the places on a map, response performance and earnings.
 */
export function HomeBoard({
  data,
  places,
  nowMs,
  stepsLeft,
  listingLive,
  listingPaused,
}: {
  data: DashboardData;
  /** The places this vendor serves. */
  places: PlaceRow[];
  nowMs: number;
  stepsLeft: number;
  listingLive: boolean;
  listingPaused: boolean;
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <RequestBoard requests={data.requests} nowMs={nowMs} activePlaceId={activePlaceId} historyLimit={6} />
      <aside aria-label="Your listing and performance" className="flex flex-col gap-6">
        <ListingStatus live={listingLive} paused={listingPaused} stepsLeft={stepsLeft} />
        <div className="relative hidden h-60 overflow-hidden rounded-2xl bg-brand-dark md:block">
          {pins.length === 0 ? (
            <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/80">
              Choose the places you serve and they appear here.
            </p>
          ) : (
            <DashboardMap pins={pins} routes={routes} activePinId={activePlaceId} onSelect={setActivePlaceId} />
          )}
        </div>
        <PerformanceChart series={data.answeredSeries} rate={data.responseRate} />
        <StatusOverview counts={data.counts} />
        <EarningsCard earnings={data.earnings} />
      </aside>
    </div>
  );
}
