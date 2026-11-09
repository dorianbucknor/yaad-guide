"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { applyFailure } from "@/components/auth/apply-failure";
import { saveListingAction, setPausedAction, submitListingAction } from "@/lib/move/actions";
import type { MoveListingView } from "@/lib/move/queries";

import { listingPayload } from "./listing-payload";
import { ReadinessCard } from "./readiness-card";
import { useSave } from "./use-save";

const formSchema = z.object({
  description: z.string().max(500, "Keep the description under 500 characters."),
});

const STATUS_LABEL = { draft: "Draft", in_review: "In review", live: "Live" } as const;

export function OverviewTab({ view }: { view: MoveListingView }): React.JSX.Element {
  const { pending, run } = useSave();
  const listing = view.listing;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { description: listing?.description ?? "" },
  });

  const save = handleSubmit((values) =>
    run(() => saveListingAction(listingPayload(view, { description: values.description })), {
      onFail: (result) => applyFailure(result, setError),
    }),
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={listing?.status === "live" ? "default" : "outline"}>
          {STATUS_LABEL[listing?.status ?? "draft"]}
        </Badge>
        {listing?.paused ? <Badge variant="outline">Paused</Badge> : null}
        {view.openFlags.length > 0 ? <Badge variant="outline">An admin is checking a change</Badge> : null}
      </div>
      {listing?.reviewNote ? (
        <p className="max-w-[65ch] rounded-xl bg-warning-subtle p-4 text-sm text-warning-subtle-foreground">
          Review note: {listing.reviewNote}
        </p>
      ) : null}

      <ReadinessCard missing={view.readiness.missing} />

      <form onSubmit={save} noValidate>
        <FieldGroup>
          <Field data-invalid={errors.description ? true : undefined}>
            <FieldLabel htmlFor="listing-description">Describe your service</FieldLabel>
            <Textarea
              id="listing-description"
              rows={5}
              maxLength={500}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={errors.description ? "listing-description-error" : "listing-description-help"}
              {...register("description")}
            />
            {errors.description ? (
              <FieldError id="listing-description-error">{errors.description.message}</FieldError>
            ) : (
              <FieldDescription id="listing-description-help">
                Up to 500 characters. Travelers read this on your listing.
              </FieldDescription>
            )}
          </Field>
          <Field>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : listing ? "Save description" : "Create my listing"}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      {listing ? (
        <div className="flex flex-col gap-6">
          <Field orientation="horizontal">
            <Switch
              id="listing-paused"
              checked={listing.paused}
              disabled={pending}
              onCheckedChange={(paused) =>
                run(() => setPausedAction(paused), { success: paused ? "Listing paused" : "Listing resumed" })
              }
            />
            <FieldLabel htmlFor="listing-paused">Pause new requests</FieldLabel>
          </Field>
          {listing.status === "draft" ? (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                className="self-start"
                disabled={pending || !view.readiness.ready}
                onClick={() => run(() => submitListingAction(), { success: "Sent for review" })}
              >
                Send for review
              </Button>
              {!view.readiness.ready ? (
                <p className="text-sm text-muted-foreground">Finish the list above to send it.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
