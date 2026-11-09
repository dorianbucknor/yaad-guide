"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { applyFailure } from "@/components/auth/apply-failure";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { changePasswordSchema } from "@/lib/schemas/settings";
import { changePasswordAction } from "@/lib/settings/actions";

export function PasswordForm({
  showCurrentPassword,
}: {
  showCurrentPassword: boolean;
}): React.JSX.Element {
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await changePasswordAction(values);
      if (result.ok) {
        reset();
        toast.success(showCurrentPassword ? "Password changed" : "Password set");
      } else {
        const message = applyFailure(result, setError);
        setFormError(message);
        toast.error(message);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        {showCurrentPassword ? (
          <TextField
            id="current-password"
            label="Current password"
            description="We ask again so nobody else can change it."
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />
        ) : null}
        <TextField
          id="new-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <TextField
          id="confirm-new-password"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        {formError ? <FieldError>{formError}</FieldError> : null}
        <Field orientation="horizontal">
          <Button type="submit" disabled={pending} className="min-h-11 w-fit md:min-h-8">
            {pending ? "Saving…" : showCurrentPassword ? "Change password" : "Set password"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
