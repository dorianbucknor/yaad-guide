"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { rejectIdentityAction, reviewProfileAction } from "@/lib/vendor/admin-actions";

/** Approve or reject a pending profile, or send the account's ID back. */
export function ReviewPanel({
  profileId,
  accountId,
  pendingReview,
}: {
  profileId: string;
  accountId: string;
  pendingReview: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [idNote, setIdNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const decide = (decision: "approved" | "rejected"): void => {
    setError(null);
    if (decision === "rejected" && note.trim() === "") {
      setError("Give a reason so the vendor knows what to fix.");
      return;
    }
    startTransition(async () => {
      const result = await reviewProfileAction({ profileId, decision, note });
      if (result.ok) {
        toast.success(decision === "approved" ? "Approved" : "Rejected");
        router.push("/admin/vendors");
        router.refresh();
      } else {
        setError(result.fieldErrors?.note ?? result.error);
        toast.error(result.error);
      }
    });
  };

  const rejectId = (): void => {
    setIdError(null);
    if (idNote.trim() === "") {
      setIdError("Say what is wrong with the ID.");
      return;
    }
    startTransition(async () => {
      const result = await rejectIdentityAction({ accountId, note: idNote });
      if (result.ok) {
        toast.success("ID rejected");
        router.refresh();
      } else {
        setIdError(result.error);
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-10">
      {pendingReview ? (
        <section aria-labelledby="decision-heading" className="flex flex-col gap-4">
          <h2 id="decision-heading" className="text-xl font-semibold">
            Decision
          </h2>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="review-note">Reason (needed to reject)</FieldLabel>
            <Textarea
              id="review-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "review-note-error" : "review-note-hint"}
            />
            {error ? (
              <FieldError id="review-note-error">{error}</FieldError>
            ) : (
              <FieldDescription id="review-note-hint">
                The vendor sees this when you reject. Optional when you approve.
              </FieldDescription>
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={() => decide("approved")}>
              Approve
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => decide("rejected")}>
              Reject
            </Button>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="id-heading" className="flex flex-col gap-4">
        <h2 id="id-heading" className="text-xl font-semibold">
          Government ID
        </h2>
        <p className="max-w-[65ch] text-sm text-muted-foreground">
          If the ID is unreadable or does not match, reject it here. Every submitted profile on this
          account goes back to the vendor, who replaces the ID once and submits again.
        </p>
        <Field data-invalid={idError ? true : undefined}>
          <FieldLabel htmlFor="id-note">What is wrong with the ID</FieldLabel>
          <Textarea
            id="id-note"
            value={idNote}
            onChange={(event) => setIdNote(event.target.value)}
            maxLength={500}
            aria-invalid={idError ? true : undefined}
            aria-describedby={idError ? "id-note-error" : undefined}
          />
          {idError ? <FieldError id="id-note-error">{idError}</FieldError> : null}
        </Field>
        <div>
          <Button type="button" variant="outline" disabled={pending} onClick={rejectId}>
            Reject ID
          </Button>
        </div>
      </section>
    </div>
  );
}
