export type RoutePoint = { x: number; y: number };

export type RouteTable = {
  samples: { x: number; y: number; length: number }[];
  total: number;
};

export type CabPose = {
  x: number;
  y: number;
  /**
   * Tilt in degrees, clamped to ±MAX_TILT_DEG. Positive when the road
   * descends (y increases), whichever way it heads. For a right-facing image
   * apply `translate(-50%,-50%) scaleX(flip ? -1 : 1) rotate(angle)` in this
   * order: CSS rotates first and mirrors last, so the nose dips on any descent.
   */
  angle: number;
  flip: boolean;
  length: number;
};

export type RouteDef = { d: string; width: number; height: number };

export const MAX_TILT_DEG = 25;

/** Samples a path at even arc-length steps. Pass `path.getPointAtLength.bind(path)`. */
export function sampleRoute(
  pointAt: (length: number) => RoutePoint,
  total: number,
  steps = 240,
): RouteTable {
  const samples: RouteTable["samples"] = [];
  for (let i = 0; i <= steps; i++) {
    const length = (i * total) / steps;
    const { x, y } = pointAt(length);
    samples.push({ x, y, length });
  }
  return { samples, total };
}

function clampUnit(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Cab position and orientation at `progress` (0-1) along the route. */
export function poseAt(table: RouteTable, progress: number): CabPose {
  const { samples, total } = table;
  const first = samples[0] ?? { x: 0, y: 0, length: 0 };
  if (total <= 0 || samples.length < 2) {
    return { x: first.x, y: first.y, angle: 0, flip: false, length: first.length };
  }

  const length = clampUnit(progress) * total;
  const last = samples.length - 1;
  const index = Math.min(last - 1, Math.floor((length / total) * last));
  const a = samples[index];
  const b = samples[index + 1];
  const span = b.length - a.length;
  const t = span > 0 ? Math.min(1, Math.max(0, (length - a.length) / span)) : 0;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const degrees = (Math.atan2(dy, Math.abs(dx)) * 180) / Math.PI;
  const angle = Math.min(MAX_TILT_DEG, Math.max(-MAX_TILT_DEG, degrees));

  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    angle,
    flip: dx < 0,
    length,
  };
}

/**
 * The first progress (0-1) at which the road reaches `y` (in the table's
 * units), or null if it never does, the table is empty, or `y` is not finite.
 */
export function progressAtY(table: RouteTable, y: number): number | null {
  if (!Number.isFinite(y) || table.total <= 0) return null;
  const hit = table.samples.find((sample) => sample.y >= y);
  return hit ? hit.length / table.total : null;
}

// Tuned by eye in the browser. Coordinates stay inside each viewBox. The wide
// road weaves around MOVE (top left, y 0 to about 430), STAY (right half,
// y 614 to about 1160) and VIBE (left half, from y 1248), crossing x 600
// only in the gaps between them. The
// narrow one wiggles in a band right of the single text column (x 325-355)
// and is stretched to the column's height, so it never crosses the text.
export const ROUTES: { wide: RouteDef; narrow: RouteDef } = {
  wide: {
    d: "M720 120 C900 90 1080 170 1040 330 C1000 470 700 520 520 560 C300 620 220 820 300 960 C380 1100 500 1160 600 1200 C760 1260 1080 1280 1040 1450 C1000 1600 700 1600 680 1720 C670 1800 780 1880 920 1880",
    width: 1200,
    height: 1920,
  },
  narrow: {
    d: "M340 30 C370 250 310 450 340 600 C370 750 310 1050 340 1200 C370 1350 310 1550 340 1770",
    width: 400,
    height: 1800,
  },
};

// Progress at which the cab reaches each stop's images on the wide route. The
// narrow layout flows with its text, so it derives these from the measured
// image rows (progressAtY) and falls back to these values.
export const ROUTE_STOPS: { move: number; stay: number; vibe: number } = {
  move: 0.08,
  stay: 0.4,
  vibe: 0.76,
};
