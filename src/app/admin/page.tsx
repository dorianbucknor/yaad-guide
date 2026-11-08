import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { serverNow } from "@/lib/server-time";
import { LuListChecks } from "react-icons/lu";

import { QueueDetail } from "@/components/admin/queue-detail";
import { QueueList } from "@/components/admin/queue-list";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorPage } from "@/components/vendor/vendor-page";
import { getQueueItems, type QueueKind } from "@/lib/admin/queue";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Review queue | YaadGuide",
};

const KINDS: readonly string[] = ["vendor", "listing", "flag", "place", "transfer"];

async function Queue({
  searchParams,
}: {
  searchParams: Promise<{ item?: string; kind?: string }>;
}): Promise<React.JSX.Element> {
  const params = await searchParams;
  const all = await getQueueItems();
  if (!all) redirect("/auth/forbidden");

  const kind = params.kind && KINDS.includes(params.kind) ? (params.kind as QueueKind) : null;
  const items = kind ? all.filter((i) => i.kind === kind) : all;
  const selected = all.find((i) => i.key === params.item) ?? null;
  const nowMs = serverNow();
  const backHref = kind ? `/admin?kind=${kind}` : "/admin";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
      <div className={cn(selected && "hidden lg:block")}>
        <QueueList items={items} all={all} selectedKey={selected?.key ?? null} kind={kind} nowMs={nowMs} />
      </div>
      <div className={cn(!selected && "hidden lg:block")}>
        {selected ? (
          <QueueDetail item={selected} backHref={backHref} nowMs={nowMs} />
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
            <LuListChecks aria-hidden className="size-8 text-brand dark:text-brand-light" />
            <p className="font-medium">{all.length === 0 ? "You're all caught up." : "Pick an item to review."}</p>
            <p className="max-w-[40ch] text-sm text-muted-foreground">
              {all.length === 0
                ? "New vendors, listings and changes appear in the queue as they come in."
                : "Its documents, photos and the approve and reject buttons open here."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ item?: string; kind?: string }>;
}): React.JSX.Element {
  return (
    <VendorPage title="Review queue" description="Everything waiting on you, oldest first." full>
      <Suspense fallback={<Skeleton className="h-[32rem] w-full rounded-2xl" aria-busy="true" />}>
        <Queue searchParams={searchParams} />
      </Suspense>
    </VendorPage>
  );
}
