"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { saveListingAction } from "@/lib/move/actions";
import { CANCELLATION_POLICIES, POLICY_COPY, type CancellationPolicy } from "@/lib/move/policy";
import type { MoveListingView } from "@/lib/move/queries";

import { listingPayload, NEED_LISTING_TEXT } from "./listing-payload";
import { useSave } from "./use-save";

/** The vendor picks one refund tier. Travelers see it, with the refund for their dates, before they pay. */
export function PolicyTab({ view }: { view: MoveListingView }): React.JSX.Element {
  const { pending, run } = useSave();
  const saved = view.listing?.cancellationPolicy ?? "flexible";
  const [policy, setPolicy] = useState<CancellationPolicy>(saved);

  if (!view.listing) return <p className="text-muted-foreground">{NEED_LISTING_TEXT}</p>;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <FieldSet>
        <FieldLegend>Cancellation and refunds</FieldLegend>
        <FieldDescription>
          Travelers see this before they pay, with the refund worked out for their pickup time. Cancelling before you accept is always free.
          Whatever is not refunded is paid to you, less commission. The card processing fee is paid by the traveler and is not refunded unless
          you or YaadGuide cause the cancellation.
        </FieldDescription>
        <RadioGroup value={policy} onValueChange={(value) => setPolicy(value as CancellationPolicy)} className="gap-3">
          {CANCELLATION_POLICIES.map((key) => (
            <Field key={key} orientation="horizontal" className="items-start gap-3 rounded-xl border border-border bg-card p-4">
              <RadioGroupItem value={key} id={`policy-${key}`} className="mt-1" />
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor={`policy-${key}`} className="text-base">
                  {POLICY_COPY[key].name}
                </FieldLabel>
                <FieldDescription>{POLICY_COPY[key].summary}</FieldDescription>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {POLICY_COPY[key].rules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </div>
            </Field>
          ))}
        </RadioGroup>
      </FieldSet>
      <Button
        type="button"
        className="self-start"
        disabled={pending || policy === saved}
        onClick={() => run(() => saveListingAction(listingPayload(view, { cancellationPolicy: policy })), { success: "Policy saved" })}
      >
        {pending ? "Saving…" : "Save policy"}
      </Button>
    </div>
  );
}
