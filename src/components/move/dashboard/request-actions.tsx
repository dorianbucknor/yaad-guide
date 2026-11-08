"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useSave } from "@/components/move/use-save";
import { acceptRequestAction, declineRequestAction } from "@/lib/move/request-actions";
import { DECLINE_REASONS } from "@/lib/schemas/move";

const REASON_LABEL: Record<(typeof DECLINE_REASONS)[number], string> = {
  dates_blocked: "I can't drive that day",
  too_far: "Too far for me",
  vehicle_unavailable: "My vehicle isn't available",
  other: "Something else",
};

/** Accept (with an optional note) and Decline (with a reason) for one pending request. */
export function RequestActions({ id, who }: { id: string; who: string }): React.JSX.Element {
  const { pending, run } = useSave();
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState<(typeof DECLINE_REASONS)[number] | null>(null);

  return (
    <div className="flex gap-2">
      <Popover open={acceptOpen} onOpenChange={setAcceptOpen}>
        <PopoverTrigger render={<Button size="sm" aria-label={`Accept request from ${who}`} />}>Accept</PopoverTrigger>
        <PopoverContent align="end" className="w-72">
          <div className="flex flex-col gap-3">
            <Field>
              <FieldLabel htmlFor={`note-${id}`}>Note for {who} (optional)</FieldLabel>
              <Textarea id={`note-${id}`} rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => acceptRequestAction({ id, note: note.trim() || undefined }), {
                  success: "Request accepted",
                  onDone: () => setAcceptOpen(false),
                })
              }
            >
              {pending ? "Accepting…" : "Confirm accept"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={declineOpen} onOpenChange={setDeclineOpen}>
        <PopoverTrigger render={<Button size="sm" variant="outline" aria-label={`Decline request from ${who}`} />}>
          Decline
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72">
          <div className="flex flex-col gap-3">
            <RadioGroup value={reason} onValueChange={(v) => setReason(v as typeof reason)} aria-label="Reason for declining">
              {DECLINE_REASONS.map((r) => (
                <Field key={r} orientation="horizontal" className="min-h-11 md:min-h-9">
                  <RadioGroupItem id={`${r}-${id}`} value={r} />
                  <FieldLabel htmlFor={`${r}-${id}`} className="font-normal">
                    {REASON_LABEL[r]}
                  </FieldLabel>
                </Field>
              ))}
            </RadioGroup>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !reason}
              onClick={() =>
                reason &&
                run(() => declineRequestAction({ id, reason }), {
                  success: "Request declined",
                  onDone: () => setDeclineOpen(false),
                })
              }
            >
              {pending ? "Declining…" : "Confirm decline"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
