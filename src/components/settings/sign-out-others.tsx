"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { signOutOthersAction } from "@/lib/settings/actions";

export function SignOutOthers(): React.JSX.Element {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      className="min-h-11 md:min-h-8"
      onClick={() =>
        startTransition(async () => {
          const result = await signOutOthersAction();
          if (result.ok) toast.success("Signed out other devices");
          else toast.error(result.error);
        })
      }
    >
      {pending ? "Signing out…" : "Sign out other devices"}
    </Button>
  );
}
