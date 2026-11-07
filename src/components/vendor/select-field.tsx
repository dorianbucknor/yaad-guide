"use client";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** A labelled select with the error under the field, for react-hook-form's Controller. */
export function SelectField({
  id,
  label,
  placeholder,
  options,
  value,
  onChange,
  onBlur,
  error,
  description,
  disabled,
}: {
  id: string;
  label: string;
  placeholder: string;
  options: readonly string[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  onBlur: () => void;
  error?: string;
  description?: string;
  disabled?: boolean;
}): React.JSX.Element {
  const items = options.map((o) => ({ value: o, label: o }));
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={items}
        value={value ?? null}
        disabled={disabled}
        onValueChange={(next) => onChange(next ?? undefined)}
        onOpenChange={(open) => {
          if (!open) onBlur();
        }}
      >
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="w-auto min-w-(--anchor-width)">
          {items.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && !error ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </Field>
  );
}
