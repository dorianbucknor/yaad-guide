"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldErrors, type Resolver } from "react-hook-form";
import type { z } from "zod";

import { MoveCard, StayCard, TripCard, VibeCard, type QuickStartValues } from "@/components/landing/quick-start-cards";
import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { firstInvalidStep, type QuickStartStep } from "@/lib/quick-start-steps";
import { quickStartSchema, type QuickStartDraft } from "@/lib/schemas/quick-start";
import { useDraftStore } from "@/stores/draft-store";
import { cn } from "@/lib/utils";

const STEP_COUNT = 4;
/** The part of the draft each step validates on Next; the TRIP step has none. */
const STEP_FIELDS = ["move", "stay", "interests", undefined] as const;

const MOVE_DEFAULTS = { passengers: 2 };
const STAY_DEFAULTS = { rooms: 1, adults: 2, children: 0 };

/** Messages for missing fields, by field name. Messages set in the schema take precedence. */
const REQUIRED_MESSAGES: Record<string, string> = {
  kind: "Choose taxi or personal driver",
  passengers: "Enter the number of passengers",
  vehicle: "Choose a vehicle",
  pickupDate: "Pick a pickup date",
  pickupTime: "Enter a pickup time",
  type: "Choose hotel or villa",
  area: "Choose an area",
  rooms: "Enter the number of rooms",
  adults: "Enter the number of adults",
  children: "Enter the number of children",
  checkIn: "Pick a check-in date",
  checkOut: "Pick a check-out date",
};

/** Replaces zod's default wording ("Invalid input: expected number…") with plain guidance. */
function quickStartMessage(issue: z.core.$ZodRawIssue): string | undefined {
  const key = issue.path?.at(-1);
  // Missing values fail as invalid_type (numbers, strings) or invalid_value (enums).
  if (issue.input === undefined && typeof key === "string" && key in REQUIRED_MESSAGES) {
    return REQUIRED_MESSAGES[key];
  }
  if (issue.code === "invalid_type" && issue.expected === "int") return "Enter a whole number";
  if (issue.code === "too_small") return `Enter ${issue.minimum} or more`;
  if (issue.code === "too_big") return `Enter ${issue.maximum} or less`;
  return undefined;
}

/** The schema as the resolver sees it: partial values in, a full draft out. */
type QuickStartSchemaTypes = { _zod: { output: QuickStartDraft; input: QuickStartValues } };

const schemaResolver = zodResolver<QuickStartValues, unknown, QuickStartDraft, QuickStartSchemaTypes>(
  quickStartSchema,
  { error: quickStartMessage },
);

type TouchableCard = "move" | "stay";

interface TouchTracking {
  resolver: Resolver<QuickStartValues, unknown, QuickStartDraft>;
  /** Marks a card as used; true only the first time. */
  touch: (card: TouchableCard) => boolean;
}

/**
 * The resolver validates only the cards the visitor touched: RHF registers
 * every field, so an untouched card can hold `{}` rather than `undefined`.
 * Created once per form; the touched set lives in this closure.
 */
function createTouchTracking(): TouchTracking {
  const touched = new Set<TouchableCard>();
  return {
    resolver: (values, context, options) =>
      schemaResolver(
        {
          ...values,
          move: touched.has("move") ? values.move : undefined,
          stay: touched.has("stay") ? values.stay : undefined,
        },
        context,
        options,
      ),
    touch: (card) => {
      if (touched.has(card)) return false;
      touched.add(card);
      return true;
    },
  };
}

/**
 * The schema's path-less "at least one" issue. The resolver files it under
 * the key "", which `FieldErrors` does not type, so it is read loosely here.
 */
function formLevelMessage(errors: FieldErrors<QuickStartValues>): string | undefined {
  const loose: Record<string, unknown> = errors;
  const error = loose[""];
  if (typeof error !== "object" || error === null || !("message" in error)) return undefined;
  return typeof error.message === "string" ? error.message : undefined;
}

export function QuickStart(): React.JSX.Element {
  const router = useRouter();
  const setDraft = useDraftStore((s) => s.setDraft);
  const [step, setStep] = useState<QuickStartStep>(0);
  const stepsRef = useRef<HTMLDivElement>(null);
  const [{ resolver, touch }] = useState(createTouchTracking);

  const form = useForm<QuickStartValues, unknown, QuickStartDraft>({
    resolver,
    defaultValues: { interests: [] },
    // Re-check a field as it changes, so a fixed error clears at once.
    mode: "onChange",
    shouldFocusError: true,
  });
  const { control, formState, handleSubmit, setValue, setError, clearErrors, trigger } = form;

  // Touching a card fills its defaults; from then on its fields are required.
  // Touch runs on every change, so it only updates the form when something is new.
  const clearFormError = (): void => {
    if (formState.errors.root) clearErrors("root");
  };
  const touchMove = (): void => {
    if (touch("move")) setValue("move", MOVE_DEFAULTS);
    clearFormError();
  };
  const touchStay = (): void => {
    if (touch("stay")) setValue("stay", STAY_DEFAULTS);
    clearFormError();
  };

  const onValid = (draft: QuickStartDraft): void => {
    setDraft(draft);
    router.push("/plan");
  };

  // Show the first step with an error before RHF focuses its first invalid
  // field: a field inside a hidden step (display: none) cannot take focus.
  const onInvalid = (errors: FieldErrors<QuickStartValues>): void => {
    const message = formLevelMessage(errors);
    if (message) setError("root", { type: "custom", message });
    flushSync(() => setStep(firstInvalidStep(errors)));
  };

  // Back and Next can disappear when the step changes (first and last steps),
  // so focus moves to the new card's heading instead of dropping to <body>.
  const goTo = (target: QuickStartStep): void => {
    flushSync(() => setStep(target));
    stepsRef.current?.children[target]?.querySelector<HTMLElement>("h2")?.focus();
  };
  const next = async (): Promise<void> => {
    const fields = STEP_FIELDS[step];
    if (fields && !(await trigger(fields, { shouldFocus: true }))) return;
    if (step < 3) goTo((step + 1) as QuickStartStep); // step + 1 is within 1..3 here.
  };
  const back = (): void => {
    if (step > 0) goTo((step - 1) as QuickStartStep); // step - 1 is within 0..2 here.
  };

  const cards = [
    <MoveCard key="move" control={control} onTouch={touchMove} />,
    <StayCard key="stay" control={control} onTouch={touchStay} />,
    <VibeCard key="vibe" control={control} onTouch={clearFormError} />,
    <TripCard
      key="trip"
      control={control}
      rootError={formState.errors.root?.message}
      submitting={formState.isSubmitting}
    />,
  ];

  return (
    <form
      noValidate
      aria-label="Plan your trip"
      onSubmit={handleSubmit(onValid, onInvalid)}
      className="flex flex-col gap-4 text-left"
    >
      <Progress
        value={((step + 1) / STEP_COUNT) * 100}
        getAriaValueText={() => `Step ${step + 1} of ${STEP_COUNT}`}
        className="rounded-[20px] bg-card p-4 text-card-foreground md:hidden"
      >
        <ProgressLabel>
          Step {step + 1} of {STEP_COUNT}
        </ProgressLabel>
      </Progress>
      {/* Announces step changes below md; display: none (silent) from md up, where all cards show. */}
      <p aria-live="polite" className="sr-only md:hidden">
        Step {step + 1} of {STEP_COUNT}
      </p>

      {/*
        One DOM for both layouts: below md only the current step shows, so values survive step changes.
        From md up the three planning cards share a row (lg) and the trip card sits centered underneath.
      */}
      <div ref={stepsRef} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, i) => (
          <div
            key={card.key}
            className={cn(
              i === step ? "block" : "hidden",
              "md:block",
              i === 3 && "md:col-span-2 md:mx-auto md:w-full md:max-w-3xl lg:col-span-3",
            )}
          >
            {card}
          </div>
        ))}
      </div>

      <div className="flex gap-3 md:hidden">
        {step > 0 ? (
          <Button type="button" variant="outline" className="flex-1" onClick={back}>
            Back
          </Button>
        ) : null}
        {step < 3 ? (
          <Button type="button" className="flex-1" onClick={next}>
            Next
          </Button>
        ) : null}
      </div>
    </form>
  );
}
