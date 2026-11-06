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
import { vendorSignUpAction } from "@/lib/auth/actions";
import { vendorSignUpSchema } from "@/lib/schemas/auth";
import { cn } from "@/lib/utils";

import { applyFailure } from "./apply-failure";
import { GoogleButton } from "./google-button";
import { TextField } from "./text-field";

export function VendorSignupForm({
  className,
}: {
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
  } = useForm({ resolver: zodResolver(vendorSignUpSchema) });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await vendorSignUpAction(values);
      if (result.ok) router.push("/auth/check-email");
      else setFormError(applyFailure(result, setError));
    });
  });

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Become a vendor</h1>
            <p className="text-sm text-balance text-muted-foreground">
              Create your vendor account. You will add your business details
              next.
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
            error={errors.email?.message}
            {...register("email")}
          />
          <TextField
            id="phone"
            label="Phone number"
            type="tel"
            autoComplete="tel"
            placeholder="876 555 1234"
            description="We will text you a code to verify this number."
            error={errors.phone?.message}
            {...register("phone")}
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
              {pending ? "Creating account…" : "Create vendor account"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldSeparator>Or continue with</FieldSeparator>
      <GoogleButton intent="vendor" label="Sign up with Google" />
      <FieldDescription className="text-center">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="underline underline-offset-4">
          Sign in
        </Link>
      </FieldDescription>
    </div>
  );
}
