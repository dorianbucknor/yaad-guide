"use client";

import type { ComponentProps } from "react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type TextFieldProps = Omit<ComponentProps<typeof Input>, "id"> & {
  id: string;
  label: string;
  error?: string;
  description?: string;
};

export function TextField({
  id,
  label,
  error,
  description,
  ...inputProps
}: TextFieldProps): React.JSX.Element {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...inputProps}
      />
      {description && !error ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </Field>
  );
}
