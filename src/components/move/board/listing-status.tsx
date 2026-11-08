"use client";

import Link from "next/link";

import { useSave } from "@/components/move/use-save";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { setPausedAction } from "@/lib/move/actions";

/** Whether the listing takes requests, with the pause switch within reach. */
export function ListingStatus({
  live,
  paused,
  stepsLeft,
}: {
  live: boolean;
  paused: boolean;
  stepsLeft: number;
}): React.JSX.Element {
  const { pending, run } = useSave();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-lg">Your listing</CardTitle>
        {live ? (
          paused ? (
            <Badge className="bg-warning-subtle text-warning-subtle-foreground">Paused</Badge>
          ) : (
            <Badge className="bg-success-subtle text-success-subtle-foreground">Live</Badge>
          )
        ) : (
          <Badge variant="outline">Not live yet</Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {live ? (
          <Field orientation="horizontal">
            <Switch
              id="home-paused"
              checked={paused}
              disabled={pending}
              onCheckedChange={(next) =>
                run(() => setPausedAction(next), { success: next ? "Listing paused" : "Listing resumed" })
              }
            />
            <FieldLabel htmlFor="home-paused">Pause new requests</FieldLabel>
          </Field>
        ) : (
          <p className="text-sm text-muted-foreground">
            {stepsLeft > 0
              ? `${stepsLeft} ${stepsLeft === 1 ? "step" : "steps"} left before you can go live.`
              : "Everything is in place. Send your listing for review to go live."}
          </p>
        )}
        <Link href="/vendor/listing" className={buttonVariants({ variant: live ? "outline" : "default" })}>
          {live ? "Edit your listing" : "Finish your listing"}
        </Link>
      </CardContent>
    </Card>
  );
}
