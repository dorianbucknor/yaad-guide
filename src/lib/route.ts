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

// Tuned by eye in the browser. Coordinates stay inside each viewBox. The wide
// road weaves around MOVE (top left), STAY (right) and VIBE (bottom left); the
// narrow one runs beside the single column and swings across the gaps.
export const ROUTES: { wide: RouteDef; narrow: RouteDef } = {
  wide: {
    d: "M680 100 C880 80 1060 150 1020 310 C980 460 520 400 300 540 C160 630 360 800 540 860 C720 920 1100 880 1040 1030 C980 1160 660 1110 620 1240 C590 1340 760 1420 920 1430",
    width: 1200,
    height: 1500,
  },
  narrow: {
    d: "M350 50 C360 150 360 220 330 300 C290 380 90 360 80 450 C70 540 330 520 350 640 C365 740 365 880 345 960 C320 1060 90 1040 80 1130 C70 1220 330 1200 350 1320 C365 1440 365 1560 345 1640 C335 1700 300 1740 260 1760",
    width: 400,
    height: 1800,
  },
};

// Progress at which the cab reaches each stop's images, on both routes.
export const ROUTE_STOPS: { move: number; stay: number; vibe: number } = {
  move: 0.08,
  stay: 0.46,
  vibe: 0.84,
};
