export type RoutePoint = { x: number; y: number };

export type RouteTable = {
  samples: { x: number; y: number; length: number }[];
  total: number;
};

export type CabPose = {
  x: number;
  y: number;
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

// Initial values; tuned by eye when the route section is built.
export const ROUTES: { wide: RouteDef; narrow: RouteDef } = {
  wide: {
    d: "M160 80 C600 60 1060 240 1000 560 C950 820 1000 900 880 1000 C600 1200 150 1100 200 1420",
    width: 1200,
    height: 1500,
  },
  narrow: {
    d: "M60 80 C300 100 360 300 330 560 C310 800 360 900 300 1000 C200 1150 40 1250 80 1720",
    width: 400,
    height: 1800,
  },
};

export const ROUTE_STOPS: { move: number; stay: number; vibe: number } = {
  move: 0.06,
  stay: 0.5,
  vibe: 0.94,
};
