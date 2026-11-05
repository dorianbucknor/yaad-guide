"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { FieldError as RhfFieldError, RefCallBack } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsClient } from "@/hooks/use-is-client";

/** A date value as stored in the draft: `YYYY-MM-DD`, or nothing yet. */
type DateValue = string | undefined;

interface DateInputProps {
  value: DateValue;
  onChange: (value: DateValue) => void;
  onBlur?: () => void;
  /** RHF's ref, so a failed submit can focus the trigger. */
  inputRef?: RefCallBack;
  error?: RhfFieldError;
}

function toDate(value: DateValue): Date | undefined {
  return value ? parseISO(value) : undefined;
}

function toValue(date: Date | undefined): DateValue {
  return date ? format(date, "yyyy-MM-dd") : undefined;
}

interface DatePickerProps extends DateInputProps {
  id: string;
  /** In range mode the calendar also shows the other end of the range. */
  range?: { from: DateValue; to: DateValue };
}

/**
 * A button that opens a calendar. Client-only: the calendar reads today's date,
 * which fails the prerender under Cache Components. The placeholder has the
 * button's exact height so nothing shifts when it swaps in.
 */
function DatePicker({
  id,
  value,
  onChange,
  onBlur,
  inputRef,
  error,
  range,
}: DatePickerProps): React.JSX.Element {
  const isClient = useIsClient();
  const [open, setOpen] = useState(false);

  if (!isClient) {
    return <div aria-hidden="true" className="h-11 w-full rounded-lg border border-input md:h-8" />;
  }

  const selected = toDate(value);
  const pick = (date: Date): void => {
    onChange(toValue(date));
    setOpen(false);
  };
  const today = new Date();

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onBlur?.();
      }}
    >
      <PopoverTrigger
        ref={inputRef}
        render={
          <Button
            id={id}
            // Name = label + chosen date, so the value is announced too.
            aria-labelledby={`${id}-label ${id}`}
            variant="outline"
            aria-invalid={error ? true : undefined}
            className="w-full justify-start bg-transparent font-normal tabular-nums"
          />
        }
      >
        <CalendarIcon aria-hidden="true" className="text-muted-foreground" />
        {selected ? format(selected, "d MMM yyyy") : <span className="text-muted-foreground">Pick a date</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {range ? (
          <Calendar
            mode="range"
            selected={{ from: toDate(range.from), to: toDate(range.to) }}
            onSelect={(_range, day) => pick(day)}
            defaultMonth={selected ?? toDate(range.from) ?? today}
            disabled={{ before: today }}
          />
        ) : (
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(_date, day) => pick(day)}
            defaultMonth={selected ?? today}
            disabled={{ before: today }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

interface DateFieldProps extends DateInputProps {
  id: string;
  label: string;
}

/** One labelled date, picked from a single-date calendar. */
export function DateField({ id, label, error, ...input }: DateFieldProps): React.JSX.Element {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel id={`${id}-label`} htmlFor={id}>
        {label}
      </FieldLabel>
      <DatePicker id={id} error={error} {...input} />
      <FieldError errors={[error]} />
    </Field>
  );
}

interface DateRangeFieldProps {
  id: string;
  startLabel: string;
  endLabel: string;
  start: DateInputProps;
  end: DateInputProps;
}

/**
 * Two labelled dates (for example check-in and check-out). Each opens a range
 * calendar that shows both ends; picking a day sets that end only, so each
 * date keeps its own error message.
 */
export function DateRangeField({ id, startLabel, endLabel, start, end }: DateRangeFieldProps): React.JSX.Element {
  const range = { from: start.value, to: end.value };
  const ends = [
    { key: "start", label: startLabel, input: start },
    { key: "end", label: endLabel, input: end },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
      {ends.map(({ key, label, input }) => (
        <Field key={key} data-invalid={input.error ? true : undefined}>
          <FieldLabel id={`${id}-${key}-label`} htmlFor={`${id}-${key}`}>
            {label}
          </FieldLabel>
          <DatePicker id={`${id}-${key}`} range={range} {...input} />
          <FieldError errors={[input.error]} />
        </Field>
      ))}
    </div>
  );
}
