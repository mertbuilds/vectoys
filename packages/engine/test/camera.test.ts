import { describe, expect, test } from "bun:test";
import { camera, type Flat, type Solid } from "../src";

type Eye = { height: number; perspective: number; camera: number; back: number; origin: number; anchor: number };

// The two eyes of the Agent Caffeine hero, and its `scene`, `project` and
// `facesEye` as they were, closed over one eye.
const DESK: Eye = { height: 70, perspective: 200, camera: -15, back: 14, origin: 0.22 * 70, anchor: 0.78 * 70 };
const PHONE: Eye = { height: 59, perspective: 600, camera: -12, back: 88.07, origin: 0.22 * 70, anchor: 53.43 };

function source({ perspective, camera: angle, back, origin, anchor }: Eye) {
  const [cos, sin] = [Math.cos((angle * Math.PI) / 180), Math.sin((angle * Math.PI) / 180)];
  const scene = ([x, y, z]: Solid): Solid => [50 + x, anchor - z * cos - y * sin, -z * sin + y * cos - back];
  const project = (point: Solid): Flat => {
    const [x, y, z] = scene(point);
    const scale = perspective / (perspective - z);
    return [50 + (x - 50) * scale, origin + (y - origin) * scale];
  };
  const facesEye = (point: Solid, [nx, ny, nz]: Solid) => {
    const [x, y, z] = scene(point);
    const [, sy, sz] = scene([nx, ny, nz]);
    const [, oy, oz] = scene([0, 0, 0]);
    return nx * (50 - x) + (sy - oy) * (origin - y) + (sz - oz) * (perspective - z) > 0;
  };
  return { project, facesEye };
}

const POINTS: Solid[] = [
  [0, 0, 0],
  [33, 23.35, 0],
  [-33, -23.35, -2.3],
  [12.5, -40, 30],
  [-7.25, 9.1, 46.7],
];

const NORMALS: Solid[] = [
  [0, 0, 1],
  [0, 0, -1],
  [0, 1, 0],
  [0, -0.97, 0.26],
  [1, 0, 0],
];

describe.each([
  ["DESK", DESK],
  ["PHONE", PHONE],
] as const)("%s eye", (_, eye) => {
  const before = source(eye);
  const after = camera({
    height: eye.height,
    perspective: eye.perspective,
    pitch: eye.camera,
    back: eye.back,
    originY: eye.origin,
    anchorY: eye.anchor,
  });

  test("projects every point where the source did", () => {
    for (const point of POINTS) {
      const [x, y] = after.project(point);
      const [sx, sy] = before.project(point);
      expect(Math.abs(x - sx)).toBeLessThan(1e-9);
      expect(Math.abs(y - sy)).toBeLessThan(1e-9);
    }
  });

  test("agrees with the source on which faces face the eye", () => {
    for (const point of POINTS) {
      for (const normal of NORMALS) {
        expect(after.facesEye(point, normal)).toBe(before.facesEye(point, normal));
      }
    }
  });
});

test("an unturned model at the anchor stands where the scene's middle is", () => {
  const eye = camera({ height: 60, perspective: 300 });
  expect(eye.toView([0, 0, 0])).toEqual([50, 30, 0]);
  expect(eye.project([0, 0, 0])).toEqual([50, 30]);
  const [, up] = eye.toView([0, 0, 10]);
  expect(up).toBeCloseTo(20, 12);
});
