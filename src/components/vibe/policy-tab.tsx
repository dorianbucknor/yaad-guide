"use client";

import { useState } from "react";

import { useSave } from "@/components/move/use-save";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { savePolicyAction } from "@/lib/vibe/actions";
import { CANCELLATION_POLICIES, GRACE_NOTE, POLICY_COPY } from "@/lib/vibe/policy";
import type { CancellationPolicy, VibeListingView } from "@/lib/vibe/types";

/** The vendor picks one refund tier. Travelers see it, with the refund for their slot, before they pay. */
export function PolicyTab({ listing }: { listing: VibeListingView }): React.JSX.Element {
  const { pending, run } = useSave();
  const saved = listing.cancellationPolicy;
  const [policy, setPolicy] = useState<CancellationPolicy>(saved);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <FieldSet>
        <FieldLegend>Cancellation and refunds</FieldLegend>
        <FieldDescription>
          Travelers see this before they pay, with the refund worked out for the slot they chose. Whatever is not refunded is paid to you,
          less commission. The card processing fee is paid by the traveler and is not refunded unless you or YaadGuide cause the
          cancellation. {GRACE_NOTE}
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
        onClick={() => run(() => savePolicyAction(listing.id, { cancellationPolicy: policy }), { success: "Policy saved" })}
      >
        {pending ? "Saving…" : "Save policy"}
      </Button>
    </div>
  );
}
