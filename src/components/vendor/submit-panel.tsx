"use client";

import { Check, Circle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/auth/result";
import { submitProfileAction } from "@/lib/vendor/actions";

export function SubmitPanel({
  ready,
  missing,
  locked,
  submit: submitProfile = submitProfileAction,
  doneHref = "/v",
}: {
  ready: boolean;
  missing: string[];
  locked: boolean;
  /** Sends the profile for review; MOVE by default, VIBE passes its own. */
  submit?: () => Promise<ActionResult>;
  /** Where to go once it is sent. */
  doneHref?: string;
}): React.JSX.Element {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const send = (): void => {
    startTransition(async () => {
      const result = await submitProfile();
      if (result.ok) {
        toast.success("Submitted");
        router.push(doneHref);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  if (locked) {
    return <p className="text-muted-foreground">Your profile is with an admin. We will show the result on your vendor home.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {ready ? (
        <p className="flex items-center gap-2 font-medium text-success-subtle-foreground">
          <Check className="size-5" aria-hidden="true" />
          Everything is in. Submit when you are ready.
        </p>
      ) : (
        <div role="status" className="flex flex-col gap-3">
          <p className="font-medium">Still needed before you can submit:</p>
          <ul className="flex flex-col gap-2">
            {missing.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <Button type="button" disabled={!ready || pending} onClick={send}>
          {pending ? "Submitting…" : "Submit for review"}
        </Button>
      </div>
    </div>
  );
}
