"use client";

import { format, parseISO } from "date-fns";
import { CheckIcon } from "lucide-react";
import {
  Controller,
  useWatch,
  type Control,
  type DeepPartial,
  type FieldError as RhfFieldError,
  type RefCallBack,
} from "react-hook-form";

import { DateField, DateRangeField } from "@/components/landing/date-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatTime12h } from "@/lib/format";
import {
  AREAS,
  INTERESTS,
  VEHICLES,
  VEHICLE_LABELS,
  areaLabel,
  type QuickStartDraft,
} from "@/lib/schemas/quick-start";

/** What the form holds while it is being filled: any part may still be missing. */
export type QuickStartValues = DeepPartial<QuickStartDraft>;

interface CardProps {
  control: Control<QuickStartValues>;
  /** Called on every change inside the card; the first one makes its fields required. */
  onTouch: () => void;
}

type Option<T extends string> = { value: T; label: string };

const MOVE_KINDS: readonly Option<"taxi" | "driver">[] = [
  { value: "taxi", label: "Taxi" },
  { value: "driver", label: "Personal driver" },
];
const STAY_TYPES: readonly Option<"hotel" | "villa">[] = [
  { value: "hotel", label: "Hotel" },
  { value: "villa", label: "Villa" },
];
const VEHICLE_OPTIONS: readonly Option<(typeof VEHICLES)[number]>[] = VEHICLES.map((v) => ({
  value: v,
  label: VEHICLE_LABELS[v],
}));
const AREA_OPTIONS: readonly Option<string>[] = AREAS.map((a) => ({ value: a.id, label: areaLabel(a.id) }));

/** Pressed chips: brand-light fill plus a check icon, so selection is not shown by color alone. */
const CHIP_CLASS =
  "rounded-full px-3 data-pressed:border-brand data-pressed:bg-brand-light data-pressed:text-brand-dark";

interface ControlProps<V> {
  value: V | undefined;
  onChange: (value: V | undefined) => void;
  onBlur: () => void;
  inputRef: RefCallBack;
  error?: RhfFieldError;
}

function invalid(error: RhfFieldError | undefined): true | undefined {
  return error ? true : undefined;
}

function ChoiceField<T extends string>({
  legend,
  options,
  value,
  onChange,
  inputRef,
  error,
}: ControlProps<T> & { legend: string; options: readonly Option<T>[] }): React.JSX.Element {
  return (
    <FieldSet data-invalid={invalid(error)}>
      <FieldLegend variant="label">{legend}</FieldLegend>
      <ToggleGroup
        variant="outline"
        className="flex-wrap"
        value={value ? [value] : []}
        onValueChange={(next) => onChange(options.find((o) => o.value === next[0])?.value)}
      >
        {options.map((o, i) => (
          <ToggleGroupItem
            key={o.value}
            value={o.value}
            ref={i === 0 ? inputRef : undefined}
            aria-invalid={invalid(error)}
            className={CHIP_CLASS}
          >
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <FieldError errors={[error]} />
    </FieldSet>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  onBlur,
  inputRef,
  error,
}: ControlProps<number> & { id: string; label: string }): React.JSX.Element {
  return (
    <Field data-invalid={invalid(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        ref={inputRef}
        type="number"
        inputMode="numeric"
        className="tabular-nums"
        value={value ?? ""}
        // An emptied (or unparseable) field is stored as undefined, never NaN.
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          onChange(Number.isNaN(n) ? undefined : n);
        }}
        onBlur={onBlur}
        aria-invalid={invalid(error)}
      />
      <FieldError errors={[error]} />
    </Field>
  );
}

function SelectField<T extends string>({
  id,
  label,
  placeholder,
  options,
  value,
  onChange,
  onBlur,
  inputRef,
  error,
}: ControlProps<T> & {
  id: string;
  label: string;
  placeholder: string;
  options: readonly Option<T>[];
}): React.JSX.Element {
  return (
    <Field data-invalid={invalid(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={options}
        value={value ?? null}
        onValueChange={(next) => onChange(next ?? undefined)}
        onOpenChange={(open) => {
          if (!open) onBlur();
        }}
      >
        <SelectTrigger id={id} ref={inputRef} className="w-full" aria-invalid={invalid(error)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        {/* Long labels ("Station Wagon/Hatchback") may be wider than a narrow trigger. */}
        <SelectContent className="w-auto min-w-(--anchor-width)">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError errors={[error]} />
    </Field>
  );
}

function QuickStartCard({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <Card className="h-full rounded-[20px] [--card-spacing:--spacing(5)] md:[--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle>
          {/* Focus target when Back/Next changes the step on mobile. */}
          <h2 tabIndex={-1} className="text-lg outline-none">
            {title}
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface ControllerArgs<V> {
  field: { value: V | undefined; onChange: (value: V | undefined) => void; onBlur: () => void; ref: RefCallBack };
  fieldState: { error?: RhfFieldError };
}

/**
 * Maps a Controller's render arguments to a control's props. A change (never
 * mere focus) touches the card, so tabbing past a card leaves it optional.
 */
function bind<V>({ field, fieldState }: ControllerArgs<V>, onTouch: () => void): ControlProps<V> {
  return {
    value: field.value,
    onChange: (value) => {
      onTouch();
      field.onChange(value);
    },
    onBlur: field.onBlur,
    inputRef: field.ref,
    error: fieldState.error,
  };
}

export function MoveCard({ control, onTouch }: CardProps): React.JSX.Element {
  return (
    <QuickStartCard title="Getting around">
      <FieldGroup>
        <Controller
          control={control}
          name="move.kind"
          render={(args) => <ChoiceField legend="Ride" options={MOVE_KINDS} {...bind(args, onTouch)} />}
        />
        <div className="grid grid-cols-2 gap-3">
          <Controller
            control={control}
            name="move.passengers"
            render={(args) => <NumberField id="qs-passengers" label="Passengers" {...bind(args, onTouch)} />}
          />
          <Controller
            control={control}
            name="move.vehicle"
            render={(args) => (
              <SelectField
                id="qs-vehicle"
                label="Vehicle"
                placeholder="Choose"
                options={VEHICLE_OPTIONS}
                {...bind(args, onTouch)}
              />
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <Controller
            control={control}
            name="move.pickupDate"
            render={(args) => <DateField id="qs-pickup-date" label="Pickup date" {...bind(args, onTouch)} />}
          />
          <Controller
            control={control}
            name="move.pickupTime"
            render={({ field, fieldState }) => (
              <Field data-invalid={invalid(fieldState.error)}>
                <FieldLabel htmlFor="qs-pickup-time">Pickup time</FieldLabel>
                <Input
                  id="qs-pickup-time"
                  ref={field.ref}
                  type="time"
                  className="tabular-nums"
                  value={field.value ?? ""}
                  onChange={(e) => {
                    onTouch();
                    field.onChange(e.target.value === "" ? undefined : e.target.value);
                  }}
                  onBlur={field.onBlur}
                  aria-invalid={invalid(fieldState.error)}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>
      </FieldGroup>
    </QuickStartCard>
  );
}

const STAY_COUNTS = [
  { name: "stay.rooms", label: "Rooms" },
  { name: "stay.adults", label: "Adults" },
  { name: "stay.children", label: "Children" },
] as const;

export function StayCard({ control, onTouch }: CardProps): React.JSX.Element {
  return (
    <QuickStartCard title="Where you'll stay">
      <FieldGroup>
        <Controller
          control={control}
          name="stay.type"
          render={(args) => <ChoiceField legend="Stay" options={STAY_TYPES} {...bind(args, onTouch)} />}
        />
        <Controller
          control={control}
          name="stay.area"
          render={(args) => (
            <SelectField
              id="qs-area"
              label="Area"
              placeholder="Choose an area"
              options={AREA_OPTIONS}
              {...bind(args, onTouch)}
            />
          )}
        />
        <div className="grid grid-cols-3 gap-3">
          {STAY_COUNTS.map(({ name, label }) => (
            <Controller
              key={name}
              control={control}
              name={name}
              render={(args) => (
                <NumberField id={`qs-${name.replace(".", "-")}`} label={label} {...bind(args, onTouch)} />
              )}
            />
          ))}
        </div>
        <Controller
          control={control}
          name="stay.checkIn"
          render={(checkIn) => (
            <Controller
              control={control}
              name="stay.checkOut"
              render={(checkOut) => (
                <DateRangeField
                  id="qs-stay"
                  startLabel="Check-in"
                  endLabel="Check-out"
                  start={bind(checkIn, onTouch)}
                  end={bind(checkOut, onTouch)}
                />
              )}
            />
          )}
        />
      </FieldGroup>
    </QuickStartCard>
  );
}


export function VibeCard({ control, onTouch }: CardProps): React.JSX.Element {
  return (
    <QuickStartCard title="Things to do">
      <Controller
        control={control}
        name="interests"
        render={({ field, fieldState }) => (
          <FieldSet data-invalid={invalid(fieldState.error)}>
            <FieldLegend variant="label">Pick anything you&apos;d enjoy</FieldLegend>
            <ToggleGroup
              multiple
              variant="outline"
              className="flex-wrap"
              value={(field.value ?? []).filter((v): v is string => v !== undefined)}
              onValueChange={(next) => {
                onTouch();
                field.onChange(next);
              }}
            >
              {INTERESTS.map((interest, i) => (
                <ToggleGroupItem
                  key={interest.id}
                  value={interest.id}
                  ref={i === 0 ? field.ref : undefined}
                  className={CHIP_CLASS}
                >
                  <CheckIcon aria-hidden="true" className="hidden group-data-pressed/toggle:block" />
                  {interest.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <FieldError errors={[fieldState.error]} />
          </FieldSet>
        )}
      />
    </QuickStartCard>
  );
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

function shortDate(value: string): string {
  return format(parseISO(value), "d MMM yyyy");
}

function summaryLine(parts: (string | false | undefined)[]): string {
  const text = parts.filter((p): p is string => typeof p === "string" && p !== "").join(", ");
  return text === "" ? "Not added" : text;
}

interface TripCardProps {
  control: Control<QuickStartValues>;
  /** The form-level "choose at least one" error, if any. */
  rootError?: string;
  submitting: boolean;
}

export function TripCard({ control, rootError, submitting }: TripCardProps): React.JSX.Element {
  const { move, stay, interests } = useWatch({ control });

  const rows = [
    {
      label: "Getting around",
      text: summaryLine([
        MOVE_KINDS.find((k) => k.value === move?.kind)?.label,
        move?.passengers !== undefined && plural(move.passengers, "passenger"),
        move?.vehicle && VEHICLE_LABELS[move.vehicle],
        move?.pickupDate && shortDate(move.pickupDate),
        move?.pickupTime && formatTime12h(move.pickupTime),
      ]),
    },
    {
      label: "Where you'll stay",
      text: summaryLine([
        STAY_TYPES.find((t) => t.value === stay?.type)?.label,
        stay?.area && areaLabel(stay.area),
        stay?.rooms !== undefined && plural(stay.rooms, "room"),
        stay?.adults !== undefined && plural(stay.adults, "adult"),
        stay?.children !== undefined && plural(stay.children, "child", "children"),
        stay?.checkIn && (stay.checkOut ? `${shortDate(stay.checkIn)} to ${shortDate(stay.checkOut)}` : `from ${shortDate(stay.checkIn)}`),
      ]),
    },
    {
      label: "Things to do",
      text: summaryLine(INTERESTS.filter((i) => interests?.includes(i.id)).map((i) => i.label)),
    },
  ];

  return (
    <QuickStartCard title="Your trip">
      {/* Stacked below md (the last mobile step); from md up the summary sits left and the action right. */}
      <div className="flex h-full flex-col gap-5 md:flex-row md:items-end md:gap-8">
        <dl className="flex min-w-0 flex-col gap-3 md:flex-1">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="font-medium">{row.label}</dt>
              <dd className="text-muted-foreground">{row.text}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-auto flex flex-col gap-3 md:w-60 md:shrink-0">
          {rootError ? (
            <p role="alert" className="text-sm text-destructive">
              {rootError}
            </p>
          ) : null}
          <Button type="submit" variant="secondary" size="lg" className="w-full" disabled={submitting}>
            Create itinerary
          </Button>
        </div>
      </div>
    </QuickStartCard>
  );
}
