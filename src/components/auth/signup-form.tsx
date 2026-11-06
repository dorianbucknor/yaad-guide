"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldSeparator,
} from "@/components/ui/field";
import { signUpAction } from "@/lib/auth/actions";
import { signUpSchema } from "@/lib/schemas/auth";
import { cn } from "@/lib/utils";

import { applyFailure, withNext } from "./apply-failure";
import { GoogleButton } from "./google-button";
import { TextField } from "./text-field";

export function SignupForm({
  next,
  className,
}: {
  next: string;
  className?: string;
}): React.JSX.Element {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(signUpSchema) });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await signUpAction(values, next);
      if (result.ok) router.push("/auth/check-email");
      else setFormError(applyFailure(result, setError));
    });
  });

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="text-sm text-balance text-muted-foreground">
              Fill in the form below to create your account
            </p>
          </div>
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
          <TextField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="m@example.com"
            description="We'll use this to contact you. We will not share your email with anyone else."
            error={errors.email?.message}
            {...register("email")}
          />
          <TextField
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            description="Must be at least 8 characters long."
            error={errors.password?.message}
            {...register("password")}
          />
          <TextField
            id="confirm-password"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          {formError ? <FieldError>{formError}</FieldError> : null}
          <Field>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating account…" : "Create account"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldSeparator>Or continue with</FieldSeparator>
      <GoogleButton next={next} label="Sign up with Google" />
      <FieldDescription className="text-center">
        Already have an account?{" "}
        <Link
          href={withNext("/auth/sign-in", next)}
          className="underline underline-offset-4"
        >
          Sign in
        </Link>
      </FieldDescription>
    </div>
  );
}
