"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { applyFailure } from "@/components/auth/apply-failure";
import { TextField } from "@/components/auth/text-field";
import { SelectField } from "@/components/vendor/select-field";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { JAMAICA_PARISHES } from "@/lib/schemas/vendor";
import { vibeBusinessSchema, type VibeBusinessInput, type VibeBusinessOutput } from "@/lib/schemas/vibe";
import { saveVibeBusinessAction } from "@/lib/vibe/profile-actions";

/** Business name and region for a Vibe profile; saving keeps the vendor on the page. */
export function VibeBusinessForm({
  businessName,
  primaryRegion,
  readOnly,
}: {
  businessName: string;
  primaryRegion: string;
  readOnly: boolean;
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
  } = useForm<VibeBusinessInput, unknown, VibeBusinessOutput>({
    resolver: zodResolver(vibeBusinessSchema),
    defaultValues: { businessName, primaryRegion },
  });

  const onSubmit = handleSubmit(
    (values) => {
      setFormError(null);
      startTransition(async () => {
        const result = await saveVibeBusinessAction(values);
        if (result.ok) {
          toast.success("Saved");
          router.refresh();
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
          id="vibe-business-name"
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
              id="vibe-primary-region"
              label="Primary region"
              placeholder="Choose a parish"
              options={JAMAICA_PARISHES}
              value={field.value || undefined}
              onChange={field.onChange}
              onBlur={field.onBlur}
              disabled={readOnly}
              description="Where your events and attractions mostly are."
              error={errors.primaryRegion?.message}
            />
          )}
        />
        {formError ? <FieldError>{formError}</FieldError> : null}
        {readOnly ? null : (
          <Field orientation="horizontal">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save details"}
            </Button>
          </Field>
        )}
      </FieldGroup>
    </form>
  );
}
