"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { applyFailure } from "@/components/auth/apply-failure";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { deleteAccountSchema } from "@/lib/schemas/settings";
import { archiveAccountAction } from "@/lib/settings/actions";

export function DeleteAccount({ hasPassword }: { hasPassword: boolean }): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { confirmation: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await archiveAccountAction(values);
      if (result.ok && result.data) {
        router.replace(`/auth/archived?until=${encodeURIComponent(result.data.until)}`);
      } else if (!result.ok) {
        const message = applyFailure(result, setError);
        setFormError(message);
        toast.error(message);
      }
    });
  });

  return (
    <>
      <p className="max-w-[65ch] text-sm text-muted-foreground">
        Deleting your account hides it right away. We keep your data for 7 days in case you change
        your mind, then delete it for good. Sign in during those days to restore it.
      </p>
      <div>
        <Button
          type="button"
          variant="destructive"
          className="min-h-11 md:min-h-8"
          onClick={() => setOpen(true)}
        >
          Delete account
        </Button>
      </div>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            reset();
            setFormError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              Any vendor listings are hidden too. Everything is deleted permanently after 7 days.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <FieldGroup>
              <TextField
                id="delete-confirmation"
                label="Type DELETE to confirm"
                autoComplete="off"
                error={errors.confirmation?.message}
                {...register("confirmation")}
              />
              {hasPassword ? (
                <TextField
                  id="delete-password"
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  error={errors.password?.message}
                  {...register("password")}
                />
              ) : null}
              {formError ? <FieldError>{formError}</FieldError> : null}
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 md:min-h-8"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={pending}
                className="min-h-11 md:min-h-8"
              >
                {pending ? "Deleting…" : "Delete account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
