"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { sendPhoneCodeAction, verifyPhoneCodeAction } from "@/lib/auth/phone-actions";
import { phoneNumberSchema } from "@/lib/schemas/auth";

import { applyFailure } from "./apply-failure";
import { TextField } from "./text-field";

const RESEND_SECONDS = 30;

export function PhoneForm({
  next,
  initialPhone = "",
}: {
  next: string;
  initialPhone?: string;
}): React.JSX.Element {
  const router = useRouter();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(phoneNumberSchema),
    defaultValues: { phone: initialPhone },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendCode = (phone: string): void => {
    setFormError(null);
    startTransition(async () => {
      const result = await sendPhoneCodeAction({ phone });
      if (result.ok) {
        setSentTo(phone);
        setCode("");
        setCooldown(RESEND_SECONDS);
      } else {
        setFormError(applyFailure(result, setError));
      }
    });
  };

  const onSend = handleSubmit((values) => sendCode(values.phone));

  const verify = (value: string): void => {
    if (!sentTo || value.length !== 6) return;
    setFormError(null);
    startTransition(async () => {
      const result = await verifyPhoneCodeAction({ phone: sentTo, code: value });
      if (result.ok) {
        router.replace(next);
        router.refresh();
      } else {
        setFormError(result.error);
        setCode("");
      }
    });
  };

  if (sentTo) {
    return (
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Enter your code</h1>
          <p className="text-sm text-balance text-muted-foreground">
            We sent a 6-digit code to {sentTo}.
          </p>
        </div>
        <Field className="items-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            onComplete={verify}
            disabled={pending}
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="Verification code"
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <InputOTPSlot key={index} index={index} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </Field>
        {formError ? <FieldError className="text-center">{formError}</FieldError> : null}
        <Field>
          <Button type="button" disabled={pending || code.length !== 6} onClick={() => verify(code)}>
            {pending ? "Verifying…" : "Verify"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending || cooldown > 0}
            onClick={() => sendCode(sentTo)}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setSentTo(null)}>
            Use a different number
          </Button>
        </Field>
      </FieldGroup>
    );
  }

  return (
    <form onSubmit={onSend} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Verify your phone number</h1>
          <p className="text-sm text-balance text-muted-foreground">
            We will text you a code to confirm this number.
          </p>
        </div>
        <TextField
          id="phone"
          label="Phone number"
          type="tel"
          autoComplete="tel"
          placeholder="876 555 1234"
          error={errors.phone?.message}
          {...register("phone")}
        />
        {formError ? <FieldError>{formError}</FieldError> : null}
        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send code"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
