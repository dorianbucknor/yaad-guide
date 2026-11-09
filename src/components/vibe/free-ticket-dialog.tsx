"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";

/**
 * Asked every time a ticket becomes free. It protects travelers: a free ticket must stay free
 * everywhere, so the vendor agrees to that, and to the penalty, before it is saved.
 */
export function FreeTicketDialog({
  open,
  onOpenChange,
  onConfirm,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pending: boolean;
}): React.JSX.Element {
  const [agreed, setAgreed] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setAgreed(false);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm this ticket is free</DialogTitle>
          <DialogDescription>Please read this before you continue.</DialogDescription>
        </DialogHeader>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
          <li>Travelers pay nothing on YaadGuide for this ticket, and YaadGuide takes no commission.</li>
          <li>
            You must not charge for it in any other way: not at the venue, not at the door, and not through extra fees, tips or add-ons
            that a traveler needs to get in.
          </li>
          <li className="font-medium">If we find that you charged for a free ticket, your vendor account can be permanently banned.</li>
        </ul>
        <Field orientation="horizontal">
          <Checkbox id="free-ticket-agree" checked={agreed} onCheckedChange={(checked) => setAgreed(checked === true)} />
          <FieldLabel htmlFor="free-ticket-agree">I understand this ticket is free and I will not charge for it.</FieldLabel>
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!agreed || pending} onClick={onConfirm}>
            {pending ? "Saving…" : "Create free ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
