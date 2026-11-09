"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { applyFailure } from "@/components/auth/apply-failure";
import { TextField } from "@/components/auth/text-field";
import { useSave } from "@/components/move/use-save";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { vibeBasicsSchema, type VibeBasicsInput } from "@/lib/schemas/vibe";
import { createListingAction, saveBasicsAction, submitListingAction } from "@/lib/vibe/actions";
import { splitCutoff, toCutoffMinutes, type CutoffUnit } from "@/lib/vibe/cutoff";
import { VIBE_CONFIG } from "@/lib/vibe/config";
import { vibeReadiness } from "@/lib/vibe/readiness";
import type { VibeListingView } from "@/lib/vibe/types";

import { ReadinessCard } from "./readiness-card";

const STATUS_LABEL = { draft: "Draft", in_review: "In review", live: "Live" } as const;
const UNIT_LABEL: Record<CutoffUnit, string> = { minutes: "Minutes", hours: "Hours", days: "Days" };

type Output = ReturnType<typeof vibeBasicsSchema.parse>;

/** Title, subtype, description, area, currency, length and booking cutoff. Creates the listing when none is given. */
export function BasicsForm({ listing }: { listing?: VibeListingView }): React.JSX.Element {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const initialCutoff = splitCutoff(listing?.bookingCutoffMinutes ?? VIBE_CONFIG.defaultCutoffMinutes);
  const [cutoffValue, setCutoffValue] = useState(String(initialCutoff.value));
  const [cutoffUnit, setCutoffUnit] = useState<CutoffUnit>(initialCutoff.unit);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors },
  } = useForm<VibeBasicsInput, unknown, Output>({
    resolver: zodResolver(vibeBasicsSchema),
    defaultValues: {
      subtype: listing?.subtype ?? "attraction",
      title: listing?.title ?? "",
      description: listing?.description ?? "",
      area: listing?.area ?? "",
      currency: listing?.currency ?? "usd",
      durationMinutes: listing?.durationMinutes ?? 60,
      bookingCutoffMinutes: listing?.bookingCutoffMinutes ?? VIBE_CONFIG.defaultCutoffMinutes,
      // Kept as it is: the Cancellation tab owns this value.
      cancellationPolicy: listing?.cancellationPolicy ?? "flexible",
    },
  });

  const updateCutoff = (value: string, unit: CutoffUnit): void => {
    setCutoffValue(value);
    setCutoffUnit(unit);
    setValue("bookingCutoffMinutes", toCutoffMinutes(Number(value === "" ? Number.NaN : value), unit), {
      shouldValidate: true,
    });
  };

  const onSubmit = handleSubmit(
    (values) => {
      setFormError(null);
      startTransition(async () => {
        if (listing) {
          const result = await saveBasicsAction(listing.id, values);
          if (result.ok) {
            toast.success("Saved");
            router.refresh();
          } else {
            const message = applyFailure(result, setError);
            setFormError(message);
            toast.error(message);
          }
          return;
        }
        const result = await createListingAction(values);
        if (result.ok && result.data) {
          toast.success("Created");
          // A dining listing starts with its details (venue type and how it is booked); the rest start with tickets.
          router.push(`/v/vibe/listings/${result.data.id}?tab=${values.subtype === "dining" ? "details" : "tickets"}`);
        } else if (!result.ok) {
          const message = applyFailure(result, setError);
          setFormError(message);
          toast.error(message);
        }
      });
    },
    () => toast.error("Please fix the highlighted fields."),
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Controller
          control={control}
          name="subtype"
          render={({ field }) => (
            <FieldSet>
              <FieldLegend variant="label">What are you listing?</FieldLegend>
              <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-3 sm:grid-cols-2">
                {(
                  [
                    ["attraction", "Attraction", "Open on a weekly pattern, like a tour or a park."],
                    ["event", "Event", "Specific dates, like a concert or a festival."],
                  ] as const
                ).map(([value, name, hint]) => (
                  <Field key={value} orientation="horizontal" className="items-start gap-3 rounded-xl border border-border bg-card p-4">
                    <RadioGroupItem value={value} id={`subtype-${value}`} className="mt-1" />
                    <div className="flex flex-col gap-1">
                      <FieldLabel htmlFor={`subtype-${value}`} className="text-base">
                        {name}
                      </FieldLabel>
                      <FieldDescription>{hint}</FieldDescription>
                    </div>
                  </Field>
                ))}
              </RadioGroup>
            </FieldSet>
          )}
        />

        <TextField id="vibe-title" label="Title" error={errors.title?.message} {...register("title")} />

        <Field data-invalid={errors.description ? true : undefined}>
          <FieldLabel htmlFor="vibe-description">Description</FieldLabel>
          <Textarea
            id="vibe-description"
            rows={5}
            maxLength={1000}
            aria-invalid={errors.description ? true : undefined}
            {...register("description")}
          />
          {errors.description ? (
            <FieldError>{errors.description.message}</FieldError>
          ) : (
            <FieldDescription>Up to 1000 characters. Travelers read this on your listing.</FieldDescription>
          )}
        </Field>

        <TextField
          id="vibe-area"
          label="Area"
          description="The town or area travelers see before they book, for example Ocho Rios."
          error={errors.area?.message}
          {...register("area")}
        />

        <Controller
          control={control}
          name="currency"
          render={({ field }) => (
            <FieldSet>
              <FieldLegend variant="label">Currency for your ticket prices</FieldLegend>
              <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6">
                {(
                  [
                    ["usd", "USD"],
                    ["jmd", "JMD"],
                  ] as const
                ).map(([value, label]) => (
                  <Field key={value} orientation="horizontal" className="w-auto gap-2">
                    <RadioGroupItem value={value} id={`currency-${value}`} />
                    <FieldLabel htmlFor={`currency-${value}`}>{label}</FieldLabel>
                  </Field>
                ))}
              </RadioGroup>
              {errors.currency ? <FieldError>{errors.currency.message}</FieldError> : null}
            </FieldSet>
          )}
        />

        <TextField
          id="vibe-duration"
          label="How long it lasts (minutes)"
          type="number"
          inputMode="numeric"
          min={15}
          max={1440}
          description="For example 120 for a two-hour tour."
          error={errors.durationMinutes?.message}
          {...register("durationMinutes", { valueAsNumber: true })}
        />

        <FieldSet>
          <FieldLegend variant="label">Stop booking</FieldLegend>
          <div className="flex gap-3">
            <Input
              id="vibe-cutoff-value"
              aria-label="Cutoff amount"
              type="number"
              inputMode="numeric"
              min={0}
              value={cutoffValue}
              aria-invalid={errors.bookingCutoffMinutes ? true : undefined}
              onChange={(event) => updateCutoff(event.target.value, cutoffUnit)}
              className="w-28"
            />
            <Select value={cutoffUnit} onValueChange={(unit) => updateCutoff(cutoffValue, unit as CutoffUnit)}>
              <SelectTrigger aria-label="Cutoff unit" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(UNIT_LABEL) as CutoffUnit[]).map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {UNIT_LABEL[unit]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {errors.bookingCutoffMinutes ? (
            <FieldError>{errors.bookingCutoffMinutes.message}</FieldError>
          ) : (
            <FieldDescription>
              Travelers can book until this long before a slot starts. Choose 0 to allow booking until it starts. The most is 7 days.
            </FieldDescription>
          )}
        </FieldSet>

        {formError ? <FieldError>{formError}</FieldError> : null}
        <Field orientation="horizontal">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : listing ? "Save changes" : "Create listing"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

/** The Basics tab of an existing listing: status, what is left to do, the form, and sending it for review. */
export function BasicsTab({ listing }: { listing: VibeListingView }): React.JSX.Element {
  const { pending, run } = useSave();
  const readiness = vibeReadiness({
    profileApproved: listing.profileApproved,
    description: listing.description,
    area: listing.area,
    addressLine1: listing.addressLine1,
    town: listing.town,
    parish: listing.parish,
    latitude: listing.latitude,
    longitude: listing.longitude,
    ticketCount: listing.tickets.length,
    hasCoverPhoto: listing.photos.some((p) => p.isCover),
    futureOpenSlotCount: listing.futureOpenSlotCount,
    ruleCount: listing.rules.length,
    autoGenerate: listing.autoGenerateSlots,
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={listing.status === "live" ? "default" : "outline"}>{STATUS_LABEL[listing.status]}</Badge>
        {listing.paused ? <Badge variant="outline">Paused</Badge> : null}
      </div>
      {listing.reviewNote ? (
        <p className="max-w-[65ch] rounded-xl bg-warning-subtle p-4 text-sm text-warning-subtle-foreground">
          Review note: {listing.reviewNote}
        </p>
      ) : null}

      {listing.status === "draft" ? (
        <>
          <ReadinessCard listingId={listing.id} missing={readiness.missing} />
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              className="self-start"
              disabled={pending || !readiness.ready}
              onClick={() => run(() => submitListingAction(listing.id), { success: "Sent for review" })}
            >
              Send for review
            </Button>
            {!readiness.ready ? <p className="text-sm text-muted-foreground">Finish the list above to send it.</p> : null}
          </div>
        </>
      ) : null}

      <BasicsForm listing={listing} />
    </div>
  );
}
