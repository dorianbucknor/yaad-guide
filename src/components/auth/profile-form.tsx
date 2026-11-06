"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { updateProfileAction } from "@/lib/auth/profile-actions";
import { profileSchema } from "@/lib/schemas/auth";

import { applyFailure } from "./apply-failure";
import { TextField } from "./text-field";

export function ProfileForm({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}): React.JSX.Element {
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName, lastName },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (result.ok) toast.success("Profile saved");
      else setFormError(applyFailure(result, setError));
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="first-name"
            label="First name"
            autoComplete="given-name"
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <TextField
            id="last-name"
            label="Last name"
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...register("lastName")}
          />
        </div>
        {formError ? <FieldError>{formError}</FieldError> : null}
        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
