"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { respondTransferAction, withdrawTransferAction } from "@/lib/vendor/actions";
import type { VendorTransfer } from "@/lib/vendor/types";

/** Vehicle transfer requests: answers for vehicles you own, and your own open requests. */
export function TransferInbox({ transfers }: { transfers: VendorTransfer[] }): React.JSX.Element | null {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (transfers.length === 0) return null;

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, done: string): void => {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(done);
        router.refresh();
      } else {
        toast.error(result.error ?? "Something went wrong. Please try again.");
      }
    });
  };

  return (
    <section aria-labelledby="transfers-heading" className="flex flex-col gap-3">
      <h2 id="transfers-heading" className="text-xl font-semibold">
        Vehicle transfers
      </h2>
      <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
        {transfers.map((transfer) => (
          <li key={transfer.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-medium">
                {transfer.label} <span className="tabular-nums text-muted-foreground">({transfer.plate})</span>
              </span>
              <span className="text-sm text-muted-foreground">
                {transfer.direction === "incoming"
                  ? transfer.status === "requested"
                    ? "Another vendor asks to take over this vehicle."
                    : "You agreed. An admin makes the final decision."
                  : transfer.status === "requested"
                    ? "Waiting for the current owner to answer."
                    : "The owner agreed. Waiting for an admin."}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {transfer.direction === "incoming" && transfer.status === "requested" ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => respondTransferAction(transfer.id, true), "Agreed")}
                  >
                    Agree
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => respondTransferAction(transfer.id, false), "Declined")}
                  >
                    Decline
                  </Button>
                </>
              ) : transfer.direction === "outgoing" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => withdrawTransferAction(transfer.id), "Withdrawn")}
                >
                  Withdraw
                </Button>
              ) : (
                <Badge variant="outline">With admin</Badge>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
