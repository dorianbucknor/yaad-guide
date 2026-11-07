import { z } from "zod";

import { isDeleteConfirmed } from "@/lib/settings/archive";
import { CHANNELS, NOTIFICATION_CATEGORIES } from "@/lib/settings/notifications";

import { emailSchema, passwordSchema } from "./auth";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
  });

export const changeEmailSchema = z.object({ email: emailSchema });

export const deleteAccountSchema = z.object({
  confirmation: z.string().refine(isDeleteConfirmed, "Type DELETE to confirm."),
  password: z.string().optional(),
});

export const preferenceSchema = z.object({
  category: z.enum(NOTIFICATION_CATEGORIES),
  channel: z.enum(CHANNELS),
  enabled: z.boolean(),
});

export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
export type ChangeEmailInput = z.input<typeof changeEmailSchema>;
export type DeleteAccountInput = z.input<typeof deleteAccountSchema>;
export type PreferenceInput = z.input<typeof preferenceSchema>;
