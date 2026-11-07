"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signedDocumentUrlAction, verifyDocumentAction } from "@/lib/vendor/admin-actions";

/** One document in the review: open it, see its expiry, mark it checked. */
export function DocumentRow({
  documentId,
  label,
  expiresOn,
  verified,
  today,
}: {
  documentId: string;
  label: string;
  expiresOn: string | null;
  verified: boolean;
  today: string;
}): React.JSX.Element {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const expired = Boolean(expiresOn && expiresOn < today);

  const view = (): void => {
    startTransition(async () => {
      const result = await signedDocumentUrlAction(documentId);
      if (result.ok && result.data) {
        window.open(result.data.url, "_blank", "noopener,noreferrer");
      } else if (!result.ok) {
        toast.error(result.error);
      }
    });
  };

  const toggle = (): void => {
    startTransition(async () => {
      const result = await verifyDocumentAction(documentId, !verified);
      if (result.ok) {
        toast.success(verified ? "Unchecked" : "Checked");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2 font-medium">
          {label}
          {verified ? (
            <Badge className="bg-success-subtle text-success-subtle-foreground">Checked</Badge>
          ) : (
            <Badge variant="outline">Not checked</Badge>
          )}
          {expired ? <Badge variant="destructive">Expired</Badge> : null}
        </span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {expiresOn ? `Expires ${expiresOn}` : "No expiry date"}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={view}>
          View file
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={toggle}>
          {verified ? "Mark not checked" : "Mark checked"}
        </Button>
      </div>
    </li>
  );
}
