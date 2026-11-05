import { describe, expect, it } from "vitest";
import {
  MAX_TILT_DEG,
  ROUTES,
  ROUTE_STOPS,
  poseAt,
  sampleRoute,
  type RoutePoint,
} from "./route";

const right = (l: number): RoutePoint => ({ x: l, y: 0 });
const left = (l: number): RoutePoint => ({ x: 100 - l, y: 0 });

describe("sampleRoute", () => {
  it("samples a straight line evenly", () => {
    const table = sampleRoute(right, 100, 10);
    expect(table.samples).toHaveLength(11);
    expect(table.samples[10].x).toBe(100);
    expect(table.samples[3].length).toBeCloseTo(30);
    expect(table.total).toBe(100);
  });
});

describe("poseAt", () => {
  it("clamps progress", () => {
    const table = sampleRoute(right, 100, 10);
    expect(poseAt(table, -1)).toMatchObject({ x: 0, length: 0 });
    expect(poseAt(table, 2)).toMatchObject({ x: 100, length: 100 });
  });

  it("midpoint of a rightward line", () => {
    const pose = poseAt(sampleRoute(right, 100, 10), 0.5);
    expect(pose.x).toBeCloseTo(50);
    expect(pose.angle).toBe(0);
    expect(pose.flip).toBe(false);
  });

  it("leftward line flips", () => {
    const pose = poseAt(sampleRoute(left, 100, 10), 0.5);
    expect(pose.flip).toBe(true);
    expect(pose.angle).toBe(0);
  });

  it("tilt is clamped", () => {
    const steep = sampleRoute((l) => ({ x: l, y: l * 10 }), 100, 10);
    expect(Math.abs(poseAt(steep, 0.5).angle)).toBe(MAX_TILT_DEG);
    const steepLeft = sampleRoute((l) => ({ x: -l, y: l * 10 }), 100, 10);
    const pose = poseAt(steepLeft, 0.5);
    expect(pose.flip).toBe(true);
    expect(Math.abs(pose.angle)).toBe(MAX_TILT_DEG);
  });

  it("lengths are non-decreasing as progress increases", () => {
    const table = sampleRoute(right, 100, 10);
    let prev = -Infinity;
    for (let i = 0; i < 20; i++) {
      const { length } = poseAt(table, i / 19);
      expect(length).toBeGreaterThanOrEqual(prev);
      prev = length;
    }
  });

  it("zero-length table does not produce NaN", () => {
    const table = sampleRoute(() => ({ x: 5, y: 7 }), 0, 10);
    for (const p of [0, 0.5, 1, NaN, 3]) {
      const pose = poseAt(table, p);
      expect(pose).toEqual({ x: 5, y: 7, angle: 0, flip: false, length: 0 });
    }
  });

  it("treats NaN progress as the start", () => {
    const pose = poseAt(sampleRoute(right, 100, 10), NaN);
    expect(pose.x).toBe(0);
  });
});

describe("route constants", () => {
  it("ROUTE_STOPS are increasing and within 0-1", () => {
    const { move, stay, vibe } = ROUTE_STOPS;
    expect(move).toBeGreaterThanOrEqual(0);
    expect(vibe).toBeLessThanOrEqual(1);
    expect(move).toBeLessThan(stay);
    expect(stay).toBeLessThan(vibe);
  });

  it("route paths are non-empty", () => {
    expect(ROUTES.wide.d.length).toBeGreaterThan(0);
    expect(ROUTES.narrow.d.length).toBeGreaterThan(0);
    expect([ROUTES.wide.width, ROUTES.wide.height]).toEqual([1200, 1500]);
    expect([ROUTES.narrow.width, ROUTES.narrow.height]).toEqual([400, 1800]);
  });
});
