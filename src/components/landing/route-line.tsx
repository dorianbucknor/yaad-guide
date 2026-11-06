import type { Ref } from "react";

import type { RouteDef } from "@/lib/route";

/**
 * The winding road, decorative only. The dashed track is measured by the
 * section; the solid overlay is the stretch already driven. Its pathLength is
 * 1, so the section shows a fraction `f` by setting dashoffset to `1 - f`.
 *
 * The SVG stretches to the stage (preserveAspectRatio="none"). From lg up the
 * stage has the route's aspect ratio, so nothing stretches; below lg the stage
 * height follows the stop text, so the narrow road stretches vertically.
 */
export function RouteLine({
  route,
  pathRef,
  drivenRef,
}: {
  route: RouteDef;
  pathRef: Ref<SVGPathElement>;
  drivenRef: Ref<SVGPathElement>;
}): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${route.width} ${route.height}`}
      preserveAspectRatio="none"
      fill="none"
      className="pointer-events-none absolute inset-0 size-full overflow-visible"
    >
      <path
        ref={pathRef}
        d={route.d}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray="14 14"
        // Light: primary at 50% over the page background composites to 2.11:1
        // (brand-light alone is 1.35:1); solid primary reads 2.42:1 against it.
        className="stroke-primary/50 dark:stroke-brand-light/45"
      />
      <path
        ref={drivenRef}
        d={route.d}
        pathLength={1}
        strokeWidth={6}
        strokeDasharray="1 1"
        strokeDashoffset={1}
        className="stroke-primary"
      />
    </svg>
  );
}
