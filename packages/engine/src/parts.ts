import type { Camera } from "./camera";
import { grow, hull, rounded, type Box } from "./outline";
import { shape } from "./path";
import { REST, compose, cross, dot, place, rotate, subtract, type Flat, type Pose, type Solid } from "./vector";

type Common = {
  /** Names the part in what `draw` returns, so a renderer can style it. */
  readonly name: string;
  /** Where the part sits in its parent, or in the scene for a part at the top. */
  readonly pose?: Pose;
  /**
   * Parts with a lower order draw first, whatever their depth. Leave it out
   * unless depth gets two parts wrong, as a laptop's lid and base can be.
   */
  readonly order?: number;
  readonly children?: readonly Part[];
};

/**
 * A rounded rectangle `box` in the part's x, y plane, its top and bottom
 * corners rounded by `radii`, stood `thickness` deep: the top face lies on
 * z = 0 and the bottom on z = -thickness, so what sits on the top needs no
 * offset. `edge` rounds or chamfers the side where it meets top and bottom,
 * as a phone's sides are; 0 keeps the side a flat band.
 */
export type Slab = Common & {
  readonly kind: "slab";
  readonly box: Box;
  readonly radii?: Flat;
  readonly thickness: number;
  readonly edge?: number;
  readonly bevel?: "round" | "chamfer";
};

/**
 * A flat rounded rectangle `lift` over its part's z = 0 plane, facing +z: a
 * screen's glass, a camera bump's top or a trackpad on its parent's face.
 */
export type Plate = Common & {
  readonly kind: "plate";
  readonly box: Box;
  readonly radii?: Flat;
  readonly lift?: number;
  readonly role?: string;
};

export type Part = Slab | Plate;

/** The parts at the top of a scene; each carries its own children. */
export type Scene = readonly Part[];

/** One flat face of a part in the part's own space, turned out along `normal`. */
export type Face = { readonly points: readonly Solid[]; readonly normal: Solid; readonly role: string };

export const slab = (options: Omit<Slab, "kind">): Slab => ({ kind: "slab", ...options });
export const plate = (options: Omit<Plate, "kind">): Plate => ({ kind: "plate", ...options });

// Steps along each quarter of a round edge. A few are enough at the sizes a
// side band shows.
const EDGE_STEPS = 3;
// How far a plate stands over its parent's face unless it says, so the two
// do not tie on depth.
const LIFT = 0.02;

/** An outline without points that repeat the one before, so every edge has a length. */
function distinct(points: readonly Flat[]): Flat[] {
  return points.filter((point, index) => {
    const [px, py] = points[(index + points.length - 1) % points.length]!;
    return Math.abs(point[0] - px) > 1e-9 || Math.abs(point[1] - py) > 1e-9;
  });
}

/** The slab's side from top to bottom, as (how far in from the outline, z). */
function profile(thickness: number, edge: number, bevel: "round" | "chamfer"): Flat[] {
  const radius = Math.min(edge, thickness / 2);
  if (radius <= 0) {
    return [
      [0, 0],
      [0, -thickness],
    ];
  }
  if (bevel === "chamfer") {
    return distinct([
      [radius, 0],
      [0, -radius],
      [0, radius - thickness],
      [radius, -thickness],
    ]);
  }
  const steps = Array.from({ length: EDGE_STEPS + 1 }, (_, step) => (Math.PI / 2) * (step / EDGE_STEPS));
  return distinct([
    ...steps.map((turn): Flat => [radius * (1 - Math.sin(turn)), -radius * (1 - Math.cos(turn))]),
    ...steps.map((turn): Flat => [radius * (1 - Math.cos(turn)), radius - thickness - radius * Math.sin(turn)]),
  ]);
}

function slabFaces({ box, radii = [0, 0], thickness, edge = 0, bevel = "round" }: Slab): Face[] {
  const outline = distinct(rounded(box, radii));
  const rings = profile(thickness, edge, bevel).map(([inset, z]) =>
    (inset === 0 ? outline : grow(outline, -inset)).map(([x, y]): Solid => [x, y, z]),
  );
  const middle: Solid = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2, -thickness / 2];
  const side = rings.slice(1).flatMap((lower, band) => {
    const upper = rings[band]!;
    return upper.map((a, index): Face => {
      const next = (index + 1) % upper.length;
      const points = [a, upper[next]!, lower[next]!, lower[index]!];
      const normal = cross(subtract(points[2]!, points[0]!), subtract(points[3]!, points[1]!));
      const out = dot(normal, subtract(a, middle)) > 0 ? 1 : -1;
      const length = Math.hypot(...normal) * out;
      return { points, normal: [normal[0] / length, normal[1] / length, normal[2] / length], role: "side" };
    });
  });
  return [
    { points: rings[0]!, normal: [0, 0, 1], role: "top" },
    { points: [...rings[rings.length - 1]!].reverse(), normal: [0, 0, -1], role: "bottom" },
    ...side,
  ];
}

/** A part's faces in its own space, before its pose places it. */
export function faces(part: Part): Face[] {
  if (part.kind === "slab") return slabFaces(part);
  const lift = part.lift ?? LIFT;
  return [
    {
      points: distinct(rounded(part.box, part.radii ?? [0, 0])).map(([x, y]): Solid => [x, y, lift]),
      normal: [0, 0, 1],
      role: part.role ?? "plate",
    },
  ];
}

/** Every part of a scene with its pose in the scene, parents before their children. */
export function placed(scene: Scene, parent: Pose = REST): { part: Part; pose: Pose }[] {
  return scene.flatMap((part) => {
    const pose = compose(parent, part.pose ?? REST);
    return [{ part, pose }, ...placed(part.children ?? [], pose)];
  });
}

/** Each part's pose in the scene by name, for laying a screen onto it with `screenQuad`. */
export const poses = (scene: Scene) => new Map(placed(scene).map(({ part, pose }) => [part.name, pose]));

/** One face as drawn: SVG path data in the scene's units. */
export type Drawn = { d: string; role: string; part: string; facing: boolean };

/** A part's outline on screen, for its outline stroke or a shadow. */
export type Silhouette = { part: string; d: string; points: Flat[] };

const mean = (points: readonly Solid[]): Solid => {
  const sum = points.reduce<Solid>(([x, y, z], [px, py, pz]) => [x + px, y + py, z + pz], [0, 0, 0]);
  return [sum[0] / points.length, sum[1] / points.length, sum[2] / points.length];
};

/**
 * A scene as the camera sees it: the faces that face the eye, far to near,
 * and each part's silhouette in the same order.
 *
 * Depth is the distance from the eye in the camera's view space, which,
 * unlike view z alone, agrees with `facesEye` towards the edges of a wide
 * perspective. Parts draw by `order`, then from the farthest centre to the
 * nearest; a part's faces draw by the same rule, ties in the order the part
 * gives them.
 *
 * That is right for convex parts that do not pass through each other and
 * whose centres sort as they overlap: inside one convex part the faces that
 * face the eye never cover each other, and a plate's centre is nearer the eye
 * than its parent's whenever the plate faces it. Parts that interlock, or a
 * part that reaches past another's centre (a lid swinging over its base),
 * need `order`. Pass `cull: false` to keep the faces turned away, marked by
 * `facing`.
 */
export function draw(scene: Scene, camera: Camera, { cull = true }: { cull?: boolean } = {}) {
  const eye: Solid = [camera.originX, camera.originY, camera.perspective];
  const far = (point: Solid) => {
    const [x, y, z] = subtract(camera.toView(point), eye);
    return x * x + y * y + z * z;
  };
  const parts = placed(scene).map(({ part, pose }) => {
    const shown = faces(part).map((face) => {
      const points = face.points.map((point) => place(pose, point));
      const facing = camera.facesEye(points[0]!, rotate(pose.rotation, face.normal));
      return { points, facing, role: face.role, depth: far(mean(points)) };
    });
    const all = shown.flatMap((face) => face.points);
    return { part, shown, all, depth: far(mean(all)) };
  });
  parts.sort((a, b) => (a.part.order ?? 0) - (b.part.order ?? 0) || b.depth - a.depth);
  const drawn = parts.flatMap(({ part, shown }) =>
    shown
      .filter((face) => face.facing || !cull)
      .sort((a, b) => b.depth - a.depth)
      .map((face): Drawn => ({ d: shape(face.points.map(camera.project)), role: face.role, part: part.name, facing: face.facing })),
  );
  const hulls = parts.map(({ part, all }): Silhouette => {
    const points = hull(all.map(camera.project));
    return { part: part.name, d: shape(points), points };
  });
  return { faces: drawn, hulls };
}
