import Link from "next/link";
import { Suspense } from "react";
import { LuArrowLeft } from "react-icons/lu";

import { FlagRow, ListingCard } from "@/components/admin/listing-review";
import { TransferQueue } from "@/components/admin/transfer-queue";
import { VendorReviewDetail } from "@/components/admin/vendor-review-detail";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KIND_LABEL, type QueueItem } from "@/lib/admin/queue";
import { getListingQueue } from "@/lib/move/admin-queries";
import { getAdminQueue } from "@/lib/vendor/admin-queries";

import { waitingLabel } from "./queue-list";

async function Body({ item }: { item: QueueItem }): Promise<React.JSX.Element> {
  if (item.kind === "vendor") return <VendorReviewDetail id={item.id} />;

  if (item.kind === "listing" || item.kind === "flag") {
    const queue = await getListingQueue();
    const listing = queue?.listings.find((l) => l.id === item.id);
    const flag = queue?.flags.find((f) => f.id === item.id);
    if (item.kind === "listing" && listing) {
      return (
        <ul>
          <ListingCard listing={listing} />
        </ul>
      );
    }
    if (item.kind === "flag" && flag) {
      return (
        <ul>
          <FlagRow flag={flag} />
        </ul>
      );
    }
  }

  if (item.kind === "transfer") {
    const queue = await getAdminQueue();
    return <TransferQueue transfers={(queue?.transfers ?? []).filter((t) => t.id === item.id)} />;
  }

  if (item.kind === "place") {
    return (
      <div className="flex flex-col gap-4">
        {item.note ? <p className="max-w-[65ch]">{item.note}</p> : <p className="text-muted-foreground">No note from the vendor.</p>}
        <div>
          <Link href="/admin/places" className={buttonVariants()}>
            Add it in Places
          </Link>
        </div>
      </div>
    );
  }

  return <p className="text-muted-foreground">This item was already handled.</p>;
}

/** The panel on the right: the selected item's evidence and its actions. */
export function QueueDetail({ item, backHref, nowMs }: { item: QueueItem; backHref: string; nowMs: number }): React.JSX.Element {
  const waited = waitingLabel(item.waitingSince, nowMs);
  return (
    <section aria-labelledby="detail-heading" className="flex min-w-0 flex-col gap-6 rounded-2xl border border-border bg-card p-4 md:p-6">
      <div className="flex flex-col gap-3">
        <Link href={backHref} className={buttonVariants({ variant: "ghost", size: "sm" }) + " -ml-2 self-start lg:hidden"}>
          <LuArrowLeft aria-hidden /> Back to the queue
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{KIND_LABEL[item.kind]}</Badge>
          {waited ? <span className="text-sm text-muted-foreground">Waiting {waited}</span> : null}
        </div>
        <h2 id="detail-heading" className="text-2xl font-semibold tracking-tight">
          {item.title}
        </h2>
        <p className="text-muted-foreground">{item.subtitle}</p>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" aria-busy="true" />}>
        <Body item={item} />
      </Suspense>
    </section>
  );
}
