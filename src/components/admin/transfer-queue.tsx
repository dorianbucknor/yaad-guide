"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { reviewTransferAction } from "@/lib/vendor/admin-actions";
import type { QueueTransfer } from "@/lib/vendor/admin-queries";

/** Transfers the current owner agreed to; the admin makes the final call. */
export function TransferQueue({ transfers }: { transfers: QueueTransfer[] }): React.JSX.Element {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const decide = (transferId: string, decision: "approved" | "rejected"): void => {
    startTransition(async () => {
      const result = await reviewTransferAction({ transferId, decision });
      if (result.ok) {
        toast.success(decision === "approved" ? "Approved" : "Rejected");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  if (transfers.length === 0) {
    return <p className="text-muted-foreground">No transfers are waiting for you.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
      {transfers.map((transfer) => (
        <li key={transfer.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="font-medium">
              {transfer.label} <span className="tabular-nums text-muted-foreground">({transfer.plate})</span>
            </span>
            <span className="text-sm text-muted-foreground">The current owner agreed to hand this vehicle over.</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={pending} onClick={() => decide(transfer.id, "approved")}>
              Approve
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => decide(transfer.id, "rejected")}
            >
              Reject
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
