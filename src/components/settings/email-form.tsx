"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { LuMail } from "react-icons/lu";
import { toast } from "sonner";

import { applyFailure } from "@/components/auth/apply-failure";
import { TextField } from "@/components/auth/text-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { changeEmailSchema } from "@/lib/schemas/settings";
import { changeEmailAction } from "@/lib/settings/actions";

export function EmailForm({
  email,
  pendingEmail,
}: {
  email: string | null;
  pendingEmail: string | null;
}): React.JSX.Element {
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(pendingEmail);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await changeEmailAction(values);
      if (result.ok) {
        setSentTo(values.email);
        reset();
        toast.success("Confirmation sent");
      } else {
        const message = applyFailure(result, setError);
        setFormError(message);
        toast.error(message);
      }
    });
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        Your email is <span className="font-medium">{email ?? "not set"}</span>.
      </p>
      {sentTo ? (
        <Alert>
          <LuMail aria-hidden="true" />
          <AlertTitle>Confirm {sentTo}</AlertTitle>
          <AlertDescription>
            We sent a link to that address. Until you open it, you still sign in with your current
            email.
          </AlertDescription>
        </Alert>
      ) : null}
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <TextField
            id="new-email"
            label="New email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          {formError ? <FieldError>{formError}</FieldError> : null}
          <Field orientation="horizontal">
            <Button type="submit" disabled={pending} className="min-h-11 w-fit md:min-h-8">
              {pending ? "Sending…" : "Change email"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
