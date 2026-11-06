"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { resetPasswordAction } from "@/lib/auth/actions";
import { resetPasswordSchema } from "@/lib/schemas/auth";

import { applyFailure } from "./apply-failure";
import { TextField } from "./text-field";

export function ResetPasswordForm(): React.JSX.Element {
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await resetPasswordAction(values);
      if (result && !result.ok) setFormError(applyFailure(result, setError));
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Set a new password</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Choose a password with at least 8 characters.
          </p>
        </div>
        <TextField
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <TextField
          id="confirm-password"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        {formError ? <FieldError>{formError}</FieldError> : null}
        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save password"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
