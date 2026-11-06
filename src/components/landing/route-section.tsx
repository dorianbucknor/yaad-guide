"use client";

import { useLayoutEffect, useRef } from "react";

import { useMediaQuery } from "@/hooks/use-media-query";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import {
  ROUTES,
  ROUTE_STOPS,
  poseAt,
  progressAtY,
  sampleRoute,
  type CabPose,
  type RouteDef,
  type RouteTable,
} from "@/lib/route";

import { Cab } from "./cab";
import { RouteLine } from "./route-line";
import { RouteStop, STOPS, type StopKey } from "./route-stops";

/**
 * Measured geometry for the route currently rendered, in a frame shaped like
 * the stage: x in viewBox units, y scaled by `stretch` (stage aspect over
 * viewBox aspect; 1 when they match). Angles are then true on screen.
 * `table` is null if measuring failed. `stops` is the progress at which each
 * stop's images appear.
 */
type Measured = {
  route: RouteDef;
  stretch: number;
  table: RouteTable | null;
  stops: Record<StopKey, number>;
};

/**
 * On the fixed desktop stage the tuned ROUTE_STOPS apply. Below lg the stops
 * are in normal flow, so where they sit on the road depends on the text: each
 * stop is reached where the road meets the top of its image row.
 */
function stopThresholds(
  route: RouteDef,
  table: RouteTable | null,
  stage: HTMLElement | null,
  rows: Record<StopKey, HTMLElement | null>,
): Record<StopKey, number> {
  const stops = { ...ROUTE_STOPS };
  if (route !== ROUTES.narrow || !table || !stage) return stops;
  // Table units per CSS pixel (x and y share one scale after the stretch).
  const unitsPerPx = route.width / stage.clientWidth;
  const stageTop = stage.getBoundingClientRect().top;
  for (const { key } of STOPS) {
    const row = rows[key];
    if (!row) continue;
    const y = (row.getBoundingClientRect().top - stageTop) * unitsPerPx;
    stops[key] = progressAtY(table, y) ?? stops[key];
  }
  return stops;
}

/** How much taller the stage is than the route's viewBox aspect ratio. */
function stretchOf(stage: HTMLElement | null, route: RouteDef): number {
  if (!stage) return 1;
  const ratio =
    (stage.clientHeight / stage.clientWidth) / (route.height / route.width);
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
}

function measureRoute(path: SVGPathElement, stretch: number): RouteTable | null {
  try {
    const total = path.getTotalLength();
    if (!Number.isFinite(total) || total <= 0) return null;
    const table = sampleRoute((length) => {
      const { x, y } = path.getPointAtLength(length);
      return { x, y: y * stretch };
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
function startPose(measured: Measured): CabPose | null {
  const match = /^M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/.exec(measured.route.d);
  if (!match) return null;
  const x = Number(match[1]);
  const y = Number(match[2]) * measured.stretch;
  return { x, y, angle: 0, flip: false, length: 0 };
}

function isFinitePose(pose: CabPose): boolean {
  return [pose.x, pose.y, pose.angle].every(Number.isFinite);
}

function placeCab(cab: HTMLElement, measured: Measured, pose: CabPose): void {
  if (!isFinitePose(pose)) return;
  const { route, stretch } = measured;
  cab.style.left = `${(pose.x / route.width) * 100}%`;
  cab.style.top = `${(pose.y / (route.height * stretch)) * 100}%`;
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
  const wide = useMediaQuery("(min-width: 1024px)");
  const route = wide ? ROUTES.wide : ROUTES.narrow;

  const stageRef = useRef<HTMLDivElement>(null);
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
      const threshold = measuredRef.current?.stops[key] ?? ROUTE_STOPS[key];
      const reached = String(progress >= threshold);
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
      const start = startPose(measured);
      if (start) placeCab(cab, measured, start);
      if (driven) driven.style.strokeDashoffset = "1";
      return;
    }

    const pose = poseAt(measured.table, progress);
    placeCab(cab, measured, pose);
    const fraction = pose.length / measured.table.total;
    if (driven && Number.isFinite(fraction)) {
      driven.style.strokeDashoffset = String(1 - fraction);
    }
  };

  useScrollProgress(scrollRef, apply);

  // Measure on mount, when the route changes (breakpoint crossing) and when
  // the stage resizes (below lg its height follows the text), then re-apply
  // the current progress so the cab lands on the new track immediately.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const remeasure = (): void => {
      const path = pathRef.current;
      const stretch = stretchOf(stage, route);
      const table = path ? measureRoute(path, stretch) : null;
      const stops = stopThresholds(route, table, stage, imagesRef.current);
      measuredRef.current = { route, stretch, table, stops };
      apply(progressRef.current ?? 0);
    };
    remeasure();
    if (!stage || typeof ResizeObserver !== "function") return;
    const observer = new ResizeObserver(remeasure);
    observer.observe(stage);
    return () => observer.disconnect();
    // `apply` only reads refs, so `route` is the only real dependency.
  }, [route]);

  return (
    <section
      id="route"
      className="scroll-mt-[calc(4rem-var(--hero-overhang))] overflow-x-clip pt-[var(--hero-overhang)]"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-32">
        {/*
          From lg up: a fixed stage with ROUTES.wide's aspect (1200x1920) and
          stops placed on it (between md and lg the stops' text and images are
          too tall for the stage). Below lg: stops in normal flow (so large text
          can never overlap or spill) and the narrow road stretched beside them.
        */}
        <div
          ref={stageRef}
          className="relative flex flex-col gap-24 pb-16 lg:block lg:aspect-[1200/1920] lg:pb-0"
        >
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
