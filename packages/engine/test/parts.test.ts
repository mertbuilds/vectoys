import { expect, test } from "bun:test";
import {
  camera,
  compose,
  draw,
  faces,
  footprint,
  hull,
  place,
  plate,
  poses,
  rotate,
  rotateX,
  rotateZ,
  shape,
  slab,
  subtract,
  type Camera,
  type Face,
  type Part,
  type Pose,
  type Solid,
} from "../src";

// A unit cube, its middle on the model's origin.
const cube = (pose: Pose = { position: [0, 0, 0.5], rotation: rotateZ(0) }) =>
  slab({ name: "cube", box: [-0.5, -0.5, 0.5, 0.5], thickness: 1, pose });

const FRONT = camera({ height: 60, perspective: 300 });
// Above, and turned so the cube's +x side comes round towards the eye.
const CORNER = camera({ height: 60, perspective: 300, yaw: -30, pitch: -20 });

/** The faces `draw` kept, as the part's own faces, in the order drawn. */
function kept(part: Part, eye: Camera, pose: Pose): Face[] {
  const own = faces(part);
  return draw([part], eye).faces.map((drawn) => {
    const face = own.find((candidate) => shape(candidate.points.map((point) => eye.project(place(pose, point)))) === drawn.d);
    expect(face).toBeDefined();
    return face!;
  });
}

const round = (normal: Solid) => normal.map((value) => Math.round(value) || 0);

test("a cube seen from straight ahead shows only its front", () => {
  const part = cube();
  const drawn = draw([part], FRONT).faces;
  expect(drawn).toHaveLength(1);
  expect(drawn[0]!.role).toBe("side");
  expect(round(kept(part, FRONT, part.pose!)[0]!.normal)).toEqual([0, 1, 0]);
});

test("a cube seen from above a corner shows top, front and one side, far to near", () => {
  const part = cube();
  const shown = kept(part, CORNER, part.pose!);
  expect(shown.map((face) => round(face.normal)).sort()).toEqual([
    [0, 0, 1],
    [0, 1, 0],
    [1, 0, 0],
  ]);
  const eye: Solid = [CORNER.originX, CORNER.originY, CORNER.perspective];
  const distance = (face: Face) => {
    const middle = face.points.reduce<Solid>((sum, point) => [sum[0] + point[0] / 4, sum[1] + point[1] / 4, sum[2] + point[2] / 4], [0, 0, 0]);
    const [x, y, z] = subtract(CORNER.toView(place(part.pose!, middle)), eye);
    return Math.hypot(x, y, z);
  };
  const distances = shown.map(distance);
  expect(distances).toEqual([...distances].sort((a, b) => b - a));
});

test("a half turn about the up axis swaps the sides that face the eye", () => {
  const before = cube();
  const after = cube({ position: [0, 0, 0.5], rotation: rotateZ(180) });
  const sides = (part: Part) =>
    kept(part, CORNER, part.pose!)
      .filter((face) => face.role === "side")
      .map((face) => round(face.normal))
      .sort();
  expect(sides(before)).toEqual([
    [0, 1, 0],
    [1, 0, 0],
  ]);
  expect(sides(after)).toEqual([
    [-1, 0, 0],
    [0, -1, 0],
  ]);
});

test("a rounded edge keeps the slab's faces closed and turned out", () => {
  const phone = slab({ name: "phone", box: [-4, -8, 4, 8], radii: [1, 1], thickness: 0.8, edge: 0.4 });
  for (const face of faces(phone)) {
    expect(Math.hypot(...face.normal)).toBeCloseTo(1, 12);
    const [x, y, z] = face.points[0]!;
    expect(face.normal[0] * x + face.normal[1] * y + face.normal[2] * (z + 0.4)).toBeGreaterThan(0);
  }
  const chamfered = slab({ name: "chamfered", box: [-4, -8, 4, 8], radii: [1, 1], thickness: 0.8, edge: 0.2, bevel: "chamfer" });
  const flat = slab({ name: "flat", box: [-4, -8, 4, 8], radii: [1, 1], thickness: 0.8 });
  const sides = (part: Part) => faces(part).filter((face) => face.role === "side").length;
  expect(sides(chamfered)).toBe(3 * sides(flat));
});

test("a coarser step draws a rounded corner with fewer side faces", () => {
  const sides = (step?: number) =>
    faces(slab({ name: "phone", box: [-4, -8, 4, 8], radii: [2, 2], thickness: 0.8, ...(step && { step }) })).filter((face) => face.role === "side").length;
  expect(sides()).toBe(4 * (20 + 1));
  expect(sides(0.5)).toBe(4 * (4 + 1));
});

test("a child part lands where its composed pose puts it", () => {
  const base: Pose = { position: [3, -2, 1], rotation: rotateZ(25) };
  const lid: Pose = { position: [0, -5, 0], rotation: rotateX(-100) };
  const glass = plate({ name: "glass", box: [-4, -6, 4, 0], pose: lid });
  const scene = [slab({ name: "base", box: [-5, -5, 5, 5], thickness: 1, pose: base, children: [glass] })];
  const world = compose(base, lid);
  const placedPose = poses(scene).get("glass")!;
  placedPose.position.forEach((value, axis) => expect(value).toBeCloseTo(world.position[axis]!, 12));
  const eye = camera({ height: 60, perspective: 200, pitch: -15 });
  const drawn = draw(scene, eye, { cull: false }).faces.find((face) => face.part === "glass")!;
  expect(drawn.d).toBe(shape(faces(glass)[0]!.points.map((point) => eye.project(place(world, point)))));
  expect(drawn.facing).toBe(eye.facesEye(place(world, [0, 0, 0]), rotate(world.rotation, [0, 0, 1])));
});

test("order draws a part first whatever its depth", () => {
  const near = slab({ name: "near", box: [-1, -1, 1, 1], thickness: 1, pose: { position: [0, 5, 0], rotation: rotateZ(0) } });
  const far = slab({ name: "far", box: [-1, -1, 1, 1], thickness: 1, pose: { position: [0, -5, 0], rotation: rotateZ(0) } });
  const names = (scene: Part[]) => draw(scene, CORNER).hulls.map((silhouette) => silhouette.part);
  expect(names([near, far])).toEqual(["far", "near"]);
  expect(names([far, { ...near, order: -1 }])).toEqual(["near", "far"]);
});

test("a footprint is the parts seen from above, grown and laid under the lowest point", () => {
  const part = cube();
  const square = (half: number, ahead = 0) =>
    shape(
      hull([
        [-half, -half + ahead],
        [half, -half + ahead],
        [half, half + ahead],
        [-half, half + ahead],
      ]).map(([x, y]) => CORNER.project([x, y, -1.5])),
    );
  expect(footprint([part], CORNER, { gap: 1 }).d).toBe(square(0.5));
  expect(footprint([part], CORNER, { gap: 1, spread: 0.25, ahead: 0.5 }).d).toBe(square(0.75, 0.5));
  expect(footprint([part], CORNER).facing).toBe(true);
  expect(footprint([part], camera({ height: 60, perspective: 300, pitch: 20 })).facing).toBe(false);
});
