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
// road weaves around MOVE (top left), STAY (right) and VIBE (bottom left). The
// narrow one wiggles in a band right of the single text column (x 325-355)
// and is stretched to the column's height, so it never crosses the text.
export const ROUTES: { wide: RouteDef; narrow: RouteDef } = {
  wide: {
    d: "M680 100 C880 80 1060 150 1020 310 C980 460 520 400 300 540 C160 630 360 800 540 860 C720 920 1100 880 1040 1030 C980 1160 660 1110 620 1240 C590 1340 760 1420 920 1430",
    width: 1200,
    height: 1500,
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
  stay: 0.46,
  vibe: 0.84,
};
