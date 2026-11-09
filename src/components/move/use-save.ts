"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/auth/result";

/** Runs a server action, shows a toast and refreshes the page data on success. */
export function useSave(): {
  pending: boolean;
  run: (
    action: () => Promise<ActionResult<unknown>>,
    options?: { success?: string; onFail?: (result: Extract<ActionResult<unknown>, { ok: false }>) => void; onDone?: () => void },
  ) => void;
} {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run: ReturnType<typeof useSave>["run"] = (action, options) => {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(options?.success ?? "Saved");
        options?.onDone?.();
        router.refresh();
      } else {
        options?.onFail?.(result);
        toast.error(result.error);
      }
    });
  };
  return { pending, run };
}
