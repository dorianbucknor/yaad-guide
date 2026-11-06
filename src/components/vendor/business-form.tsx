"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { applyFailure } from "@/components/auth/apply-failure";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { businessSchema, JAMAICA_PARISHES } from "@/lib/schemas/vendor";
import { saveBusinessAction } from "@/lib/vendor/actions";

import { SelectField } from "./select-field";

export function BusinessForm({
  businessName,
  primaryRegion,
  readOnly,
  nextHref,
}: {
  businessName: string;
  primaryRegion: string;
  readOnly: boolean;
  nextHref: string;
}): React.JSX.Element {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      businessName,
      primaryRegion: (primaryRegion || undefined) as (typeof JAMAICA_PARISHES)[number] | undefined,
    },
  });

  const onSubmit = handleSubmit(
    (values) => {
      setFormError(null);
      startTransition(async () => {
        const result = await saveBusinessAction(values);
        if (result.ok) {
          toast.success("Saved");
          router.push(nextHref);
        } else {
          const message = applyFailure(result, setError);
          setFormError(message);
          toast.error(message);
        }
      });
    },
    () => toast.error("Please fill in the required fields."),
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <TextField
          id="business-name"
          label="Business name (optional)"
          autoComplete="organization"
          description="Travelers see this next to your listings. Leave it empty to use your own name."
          disabled={readOnly}
          error={errors.businessName?.message}
          {...register("businessName")}
        />
        <Controller
          control={control}
          name="primaryRegion"
          render={({ field }) => (
            <SelectField
              id="primary-region"
              label="Primary region"
              placeholder="Choose a parish"
              options={JAMAICA_PARISHES}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              disabled={readOnly}
              description="Where you mostly work. It does not limit where you can take travelers."
              error={errors.primaryRegion?.message}
            />
          )}
        />
        {formError ? <FieldError>{formError}</FieldError> : null}
        {readOnly ? null : (
          <Field>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save and continue"}
            </Button>
          </Field>
        )}
      </FieldGroup>
    </form>
  );
}
