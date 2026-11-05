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
  /** Where the stop sits on the stage from md up. Below md stops are in normal flow. */
  place: string;
  images: StopImage[];
};

// v1 scope only: no flights, cruise, car rental or packages.
export const STOPS: Stop[] = [
  {
    key: "move",
    mark: "MOVE",
    title: "A ride from the airport, a driver for the day",
    body: "Airport transfers and personal drivers. Tell us when you land or where you're headed, and a local driver takes it from there.",
    place: "md:top-0 md:left-0",
    images: [
      { src: "/landing/cab.webp", width: 817, height: 512, sizes: "(min-width: 768px) 150px, 25vw", className: "w-[34%]" },
      { src: "/landing/coach.webp", width: 850, height: 483, sizes: "(min-width: 768px) 150px, 25vw", className: "w-[34%]" },
      { src: "/landing/small-plane.webp", width: 1000, height: 1000, sizes: "(min-width: 768px) 120px, 20vw", className: "w-[26%]" },
    ],
  },
  {
    key: "stay",
    mark: "STAY",
    title: "A place to stay",
    body: "Hotels and villas across the island, from Negril to Port Antonio. Pick the area that suits your trip.",
    place: "md:top-[32%] md:right-0",
    images: [
      { src: "/landing/hotel.webp", width: 286, height: 321, sizes: "(min-width: 768px) 200px, 40vw", className: "w-[52%] md:w-[36%]" },
    ],
  },
  {
    key: "vibe",
    mark: "VIBE",
    title: "Food, parties and things to do",
    body: "Rivers, beaches, jerk chicken and parties. Add what you want to do and eat, day by day.",
    place: "md:top-[64%] md:left-0",
    images: [
      { src: "/landing/beach.webp", width: 1200, height: 1521, sizes: "(min-width: 768px) 220px, 40vw", className: "w-[52%] md:w-[46%]" },
    ],
  },
];

/**
 * One pillar stop. Text is always visible; the images fade in when the
 * section sets `data-reached="true"` on `imagesRef`.
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
      className={cn(
        "relative flex w-[68%] scroll-mt-20 gap-2 md:absolute md:w-[42%] md:gap-5",
        stop.place,
      )}
    >
      {/* Pillar mark: the only uppercase lettering, part of the illustration. */}
      <span
        aria-hidden="true"
        className="shrink-0 rotate-180 font-heading leading-none font-bold tracking-wide text-primary/30 select-none [writing-mode:vertical-rl] max-md:text-3xl md:text-6xl"
      >
        {stop.mark}
      </span>
      <div className="min-w-0">
        <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
          {stop.title}
        </h2>
        <p className="mt-3 max-w-[40ch] text-muted-foreground md:text-lg">
          {stop.body}
        </p>
        <div
          ref={imagesRef}
          data-reached="false"
          className="mt-5 flex items-end gap-3 opacity-0 transition-opacity duration-300 data-[reached=true]:opacity-100"
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
    </div>
  );
}
