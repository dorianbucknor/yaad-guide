"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
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
import { signInAction } from "@/lib/auth/actions";
import { signInSchema } from "@/lib/schemas/auth";
import { cn } from "@/lib/utils";

import { applyFailure, withNext } from "./apply-failure";
import { GoogleButton } from "./google-button";
import { TextField } from "./text-field";

export function LoginForm({
  next,
  className,
}: {
  next: string;
  className?: string;
}): React.JSX.Element {
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(signInSchema) });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await signInAction(values, next);
      if (result && !result.ok) setFormError(applyFailure(result, setError));
    });
  });

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Sign in to your account</h1>
            <p className="text-sm text-balance text-muted-foreground">
              Enter your email below to sign in
            </p>
          </div>
          <TextField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="m@example.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <div className="flex flex-col gap-2">
            <TextField
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register("password")}
            />
            <Link
              href="/auth/forgot-password"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
          {formError ? <FieldError>{formError}</FieldError> : null}
          <Field>
            <Button type="submit" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldSeparator>Or continue with</FieldSeparator>
      <GoogleButton next={next} />
      <FieldDescription className="text-center">
        Don&apos;t have an account?{" "}
        <Link
          href={withNext("/auth/sign-up", next)}
          className="underline underline-offset-4"
        >
          Sign up
        </Link>
      </FieldDescription>
    </div>
  );
}
