import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

export const passwordSchema = z
  .string()
  .min(8, "Must be at least 8 characters long.");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Required.")
  .max(60, "Must be 60 characters or fewer.")
  .regex(/^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u, "Use letters only.");

const E164 = /^\+[1-9]\d{7,14}$/;

/** Accepts common formats and normalizes to E.164 (bare 10 digits mean +1). */
export const phoneSchema = z
  .string()
  .transform((value) => {
    const compact = value.replace(/[\s().-]/g, "");
    if (/^\d{10}$/.test(compact)) return `+1${compact}`;
    if (/^1\d{10}$/.test(compact)) return `+${compact}`;
    return compact;
  })
  .pipe(z.string().regex(E164, "Enter a valid phone number."));

const passwordPair = {
  password: passwordSchema,
  confirmPassword: z.string(),
};

function passwordsMatch<T extends { password: string; confirmPassword: string }>(
  data: T,
  ctx: z.RefinementCtx,
) {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: "custom",
      path: ["confirmPassword"],
      message: "Passwords do not match.",
    });
  }
}

const signUpBase = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  ...passwordPair,
});

export const signUpSchema = signUpBase.superRefine(passwordsMatch);

export const vendorSignUpSchema = signUpBase
  .extend({ phone: phoneSchema })
  .superRefine(passwordsMatch);

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object(passwordPair)
  .superRefine(passwordsMatch);

export const phoneNumberSchema = z.object({ phone: phoneSchema });

export const phoneOtpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export const phoneVerifySchema = phoneNumberSchema.extend(phoneOtpSchema.shape);

export const profileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
});

export type SignUpInput = z.input<typeof signUpSchema>;
export type VendorSignUpInput = z.input<typeof vendorSignUpSchema>;
export type SignInInput = z.input<typeof signInSchema>;
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
export type PhoneNumberInput = z.input<typeof phoneNumberSchema>;
export type PhoneOtpInput = z.input<typeof phoneOtpSchema>;
export type ProfileInput = z.input<typeof profileSchema>;
