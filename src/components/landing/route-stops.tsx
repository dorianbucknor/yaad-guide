import Image from "next/image";
import type { Ref } from "react";

import type { ROUTE_STOPS } from "@/lib/route";
import { cn } from "@/lib/utils";

export type StopKey = keyof typeof ROUTE_STOPS;

type StopImage = {
  src: string;
  width: number;
  height: number;
  sizes: string;
  className: string;
};

type Stop = {
  key: StopKey;
  mark: string;
  title: string;
  body: string;
  /** Where the stop sits on the stage from lg up. Below lg stops are in normal flow. */
  place: string;
  /** Which edge of the stop the pillar mark hugs: the outer edge, away from the road. */
  markSide: "left" | "right";
  images: StopImage[];
};

// v1 scope only: no flights, cruise, car rental or packages.
// Image widths are relative to the stop. MOVE wraps to two rows (cab and
// coach, then the small plane). The hotel source is only 286px wide, so it is
// capped at 400px (1.4x) to stay sharp.
export const STOPS: Stop[] = [
  {
    key: "move",
    mark: "MOVE",
    title: "A ride from the airport, a driver for the day",
    body: "Airport transfers and personal drivers. Tell us when you land or where you're headed, and a local driver takes it from there.",
    place: "lg:top-0 lg:left-0 lg:pr-8 lg:pl-36",
    markSide: "left",
    images: [
      { src: "/landing/cab.webp", width: 817, height: 512, sizes: "(min-width: 1024px) 200px, 35vw", className: "w-[47%]" },
      { src: "/landing/coach.webp", width: 850, height: 483, sizes: "(min-width: 1024px) 200px, 35vw", className: "w-[47%]" },
      { src: "/landing/small-plane.webp", width: 1000, height: 1000, sizes: "(min-width: 1024px) 150px, 30vw", className: "w-[40%] lg:w-[34%]" },
    ],
  },
  {
    key: "stay",
    mark: "STAY",
    title: "A place to stay",
    body: "Hotels and villas across the island, from Negril to Port Antonio. Pick the area that suits your trip.",
    place: "lg:top-[32%] lg:right-0 lg:pl-8 lg:pr-36",
    markSide: "right",
    images: [
      { src: "/landing/hotel.webp", width: 286, height: 321, sizes: "(min-width: 1024px) 270px, 52vw", className: "w-[70%] max-w-[400px] lg:w-[62%]" },
    ],
  },
  {
    key: "vibe",
    mark: "VIBE",
    title: "Food, parties and things to do",
    body: "Rivers, beaches, jerk chicken and parties. Add what you want to do and eat, day by day.",
    place: "lg:top-[65%] lg:left-0 lg:pr-8 lg:pl-36",
    markSide: "left",
    images: [
      { src: "/landing/beach.webp", width: 1200, height: 1521, sizes: "(min-width: 1024px) 280px, 60vw", className: "w-[80%] lg:w-[64%]" },
    ],
  },
];

/** Length of the lettering along the mark, in viewBox units (the viewBox is 100 wide). */
const MARK_LENGTH = 360;

/**
 * The vertical MOVE / STAY / VIBE lettering, the only uppercase on the page,
 * as tall as its stop and read bottom to top. Two renderings:
 * - Below lg, behind the content at the outer edge: the viewBox keeps the
 *   proportions, so the width follows the height (never wider than the stop).
 *   At 15% it changes text contrast very little (muted text stays above 5:1).
 * - From lg up, in the stop's 9rem gutter beside the content: 8rem wide and
 *   stretched to the stop's height. Stops are 430 to 580px tall there, close
 *   to the lettering's natural 3.6:1, so the letters barely distort.
 */
function PillarMark({ mark, side }: { mark: string; side: Stop["markSide"] }): React.JSX.Element {
  const text = (
    <text
      x={-MARK_LENGTH + 4}
      y={86}
      transform="rotate(-90)"
      fontSize={100}
      textLength={MARK_LENGTH - 8}
      lengthAdjust="spacing"
      fill="currentColor"
    >
      {mark}
    </text>
  );
  const shared = cn(
    "pointer-events-none absolute inset-y-0 h-full font-heading font-bold text-primary/15 select-none",
    side === "left" ? "left-0" : "right-0",
  );
  return (
    <>
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox={`0 0 100 ${MARK_LENGTH}`}
        className={cn(shared, "-z-10 w-auto max-w-full lg:hidden")}
      >
        {text}
      </svg>
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox={`0 0 100 ${MARK_LENGTH}`}
        preserveAspectRatio="none"
        className={cn(shared, "hidden w-32 lg:block")}
      >
        {text}
      </svg>
    </>
  );
}

/**
 * One pillar stop: heading and text first, the images below them. Text is
 * always visible; the images fade in when the section sets
 * `data-reached="true"` on `imagesRef`.
 */
export function RouteStop({
  stop,
  imagesRef,
}: {
  stop: Stop;
  imagesRef: Ref<HTMLDivElement>;
}): React.JSX.Element {
  return (
    <div
      id={stop.key}
      tabIndex={-1}
      className={cn(
        "relative isolate w-[74%] scroll-mt-20 lg:absolute lg:w-[54%]",
        stop.place,
      )}
    >
      <PillarMark mark={stop.mark} side={stop.markSide} />
      <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
        {stop.title}
      </h2>
      <p className="mt-3 max-w-[40ch] text-muted-foreground md:text-lg">
        {stop.body}
      </p>
      <div
        ref={imagesRef}
        data-reached="false"
        className="mt-5 flex flex-wrap items-end gap-3 opacity-0 transition-opacity duration-300 data-[reached=true]:opacity-100 lg:gap-2"
      >
        {stop.images.map((image) => (
          <Image
            key={image.src}
            src={image.src}
            alt=""
            width={image.width}
            height={image.height}
            sizes={image.sizes}
            className={cn("h-auto", image.className)}
          />
        ))}
      </div>
    </div>
  );
}
