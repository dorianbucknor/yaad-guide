"use client";

import { useLayoutEffect, useRef } from "react";

import { useMediaQuery } from "@/hooks/use-media-query";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import {
  ROUTES,
  ROUTE_STOPS,
  poseAt,
  sampleRoute,
  type CabPose,
  type RouteDef,
  type RouteTable,
} from "@/lib/route";

import { Cab } from "./cab";
import { RouteLine } from "./route-line";
import { RouteStop, STOPS, type StopKey } from "./route-stops";

/** Measured geometry for the route currently rendered. `table` is null if measuring failed. */
type Measured = { route: RouteDef; table: RouteTable | null };

function measureRoute(path: SVGPathElement): RouteTable | null {
  try {
    const total = path.getTotalLength();
    if (!Number.isFinite(total) || total <= 0) return null;
    const table = sampleRoute((length) => {
      const { x, y } = path.getPointAtLength(length);
      return { x, y };
    }, total);
    const finite = table.samples.every(
      (s) => Number.isFinite(s.x) && Number.isFinite(s.y),
    );
    return finite ? table : null;
  } catch {
    return null;
  }
}

/** The route's first point, read from its leading "M x y". */
function startPose(route: RouteDef): CabPose | null {
  const match = /^M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/.exec(route.d);
  if (!match) return null;
  return { x: Number(match[1]), y: Number(match[2]), angle: 0, flip: false, length: 0 };
}

function isFinitePose(pose: CabPose): boolean {
  return [pose.x, pose.y, pose.angle].every(Number.isFinite);
}

function placeCab(cab: HTMLElement, route: RouteDef, pose: CabPose): void {
  if (!isFinitePose(pose)) return;
  cab.style.left = `${(pose.x / route.width) * 100}%`;
  cab.style.top = `${(pose.y / route.height) * 100}%`;
  // Rotate first, mirror last (CSS applies right to left): nose dips on any descent.
  cab.style.transform = `translate(-50%, -50%) scaleX(${pose.flip ? -1 : 1}) rotate(${pose.angle}deg)`;
  cab.style.opacity = "1";
}

/**
 * MOVE, STAY and VIBE along one winding road, with a cab that drives it as
 * the page scrolls. Scrolling never re-renders: every update is written
 * straight to the DOM through refs.
 */
export function RouteSection(): React.JSX.Element {
  const wide = useMediaQuery("(min-width: 768px)");
  const route = wide ? ROUTES.wide : ROUTES.narrow;

  const scrollRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const drivenRef = useRef<SVGPathElement>(null);
  const cabRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<Record<StopKey, HTMLDivElement | null>>({
    move: null,
    stay: null,
    vibe: null,
  });
  const measuredRef = useRef<Measured | null>(null);
  const progressRef = useRef<number | null>(null);

  const apply = (progress: number): void => {
    progressRef.current = progress;

    for (const { key } of STOPS) {
      const images = imagesRef.current[key];
      const reached = String(progress >= ROUTE_STOPS[key]);
      if (images && images.dataset.reached !== reached) {
        images.dataset.reached = reached;
      }
    }

    const measured = measuredRef.current;
    const cab = cabRef.current;
    const driven = drivenRef.current;
    if (!measured || !cab) return;
    if (!measured.table) {
      // Measuring failed: the cab rests at the start and nothing is driven.
      const start = startPose(measured.route);
      if (start) placeCab(cab, measured.route, start);
      if (driven) driven.style.strokeDashoffset = "1";
      return;
    }

    const pose = poseAt(measured.table, progress);
    placeCab(cab, measured.route, pose);
    const fraction = pose.length / measured.table.total;
    if (driven && Number.isFinite(fraction)) {
      driven.style.strokeDashoffset = String(1 - fraction);
    }
  };

  useScrollProgress(scrollRef, apply);

  // Measure once per route (mount and breakpoint crossings), then re-apply
  // the current progress so the cab lands on the new track immediately.
  useLayoutEffect(() => {
    const path = pathRef.current;
    measuredRef.current = { route, table: path ? measureRoute(path) : null };
    const progress = progressRef.current;
    if (progress !== null) apply(progress);
    else if (cabRef.current && !measuredRef.current.table) {
      const start = startPose(route);
      if (start) placeCab(cabRef.current, route, start);
    }
    // `apply` only reads refs, so `route` is the only real dependency.
  }, [route]);

  return (
    <section
      id="route"
      className="scroll-mt-[calc(4rem-var(--hero-overhang))] overflow-x-clip pt-[var(--hero-overhang)]"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-32">
        {/* Aspect ratios match ROUTES.narrow (400x1800) and ROUTES.wide (1200x1500). */}
        <div className="relative aspect-[400/1800] md:aspect-[1200/1500]">
          {/*
            Scroll is measured on this box, which runs 40svh past the road's end,
            so the cab rides in the middle of the screen (about 75% down to 60%)
            instead of at the bottom edge.
          */}
          <div
            ref={scrollRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -bottom-[40svh]"
          />
          <RouteLine route={route} pathRef={pathRef} drivenRef={drivenRef} />
          {STOPS.map((stop) => (
            <RouteStop
              key={stop.key}
              stop={stop}
              imagesRef={(element) => {
                imagesRef.current[stop.key] = element;
              }}
            />
          ))}
          <Cab ref={cabRef} />
        </div>
      </div>
    </section>
  );
}
