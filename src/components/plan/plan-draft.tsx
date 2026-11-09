"use client";

import { format, isValid, parseISO } from "date-fns";
import Link from "next/link";
import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/skeleton";
import {
  areaLabel,
  INTERESTS,
  tripStartDate,
  VEHICLE_LABELS,
  type QuickStartDraft,
} from "@/lib/schemas/quick-start";
import { formatTime12h } from "@/lib/format";
import { hydrateDraft, useDraftStore } from "@/stores/draft-store";

/** Local-time display of a "YYYY-MM-DD" string (no timezone shift). */
function day(iso: string): string {
  const parsed = parseISO(iso);
  return isValid(parsed) ? format(parsed, "d MMM yyyy") : iso;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Summary({ draft }: { draft: QuickStartDraft }): React.JSX.Element {
  const { move, stay } = draft;
  const start = tripStartDate(draft);
  const chips = draft.interests.flatMap((id) => {
    const interest = INTERESTS.find((i) => i.id === id);
    return interest ? [interest] : [];
  });

  return (
    <div className="flex flex-col gap-6">
      {start ? <p className="font-medium">Trip starts {day(start)}</p> : null}
      {move ? (
        <Section title="Move">
          <p>{move.kind === "taxi" ? "Taxi" : "Personal driver"}</p>
          <p className="text-muted-foreground">
            {plural(move.passengers, "passenger")},{" "}
            {VEHICLE_LABELS[move.vehicle]}
          </p>
          <p className="text-muted-foreground">
            Pickup {day(move.pickupDate)} at {formatTime12h(move.pickupTime)}
          </p>
        </Section>
      ) : null}
      {stay ? (
        <Section title="Stay">
          <p>
            {stay.type === "hotel" ? "Hotel" : "Villa"} in{" "}
            {areaLabel(stay.area)}
          </p>
          <p className="text-muted-foreground">
            {plural(stay.rooms, "room")}, {plural(stay.adults, "adult")},{" "}
            {stay.children} {stay.children === 1 ? "child" : "children"}
          </p>
          <p className="text-muted-foreground">
            {day(stay.checkIn)} to {day(stay.checkOut)}
          </p>
        </Section>
      ) : null}
      {chips.length > 0 ? (
        <Section title="Vibe">
          <ul className="flex flex-wrap gap-2">
            {chips.map((interest) => (
              <li key={interest.id}>
                <Badge variant="secondary">{interest.label}</Badge>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

export function PlanDraft(): React.JSX.Element {
  const draft = useDraftStore((s) => s.draft);
  const hydrated = useDraftStore((s) => s.hydrated);

  useEffect(() => {
    void hydrateDraft();
  }, []);

  return (
    <div className="flex max-w-[65ch] flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Your trip</h1>
      {!hydrated ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : draft ? (
        <>
          <p className="text-muted-foreground">
            This is a draft saved in this browser. The itinerary builder is
            coming.
          </p>
          <Summary draft={draft} />
          <div>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Back to home
            </Link>
          </div>
        </>
      ) : (
        <>
          <p>No trip started yet</p>
          <div>
            <Link href="/" className={buttonVariants()}>
              Start planning
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
