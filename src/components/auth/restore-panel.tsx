"use client";

import { CalendarClockIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { keepDeletingAction, restoreAccountAction } from "@/lib/settings/actions";

export function RestorePanel({ until }: { until: string | null }): React.JSX.Element {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function restore() {
    startTransition(async () => {
      const result = await restoreAccountAction();
      if (result.ok) {
        toast.success("Restored");
        router.replace("/");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function keepDeleting() {
    startTransition(async () => {
      const result = await keepDeletingAction();
      if (result.ok) {
        router.replace("/");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Restore your account?</h1>
        <p className="text-sm text-muted-foreground">
          You deleted this account. Restore it to pick up where you left off.
        </p>
      </div>
      <Alert>
        <CalendarClockIcon aria-hidden="true" />
        <AlertTitle>
          {until
            ? `Your account is scheduled for deletion on ${until}`
            : "Your account is scheduled for deletion"}
        </AlertTitle>
        <AlertDescription>
          After that date everything is deleted for good and can&apos;t be restored.
        </AlertDescription>
      </Alert>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" disabled={pending} onClick={restore} className="min-h-11 md:min-h-8">
          {pending ? "Working…" : "Restore"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={keepDeleting}
          className="min-h-11 md:min-h-8"
        >
          Keep deleting
        </Button>
      </div>
    </div>
  );
}
