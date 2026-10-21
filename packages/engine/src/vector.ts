/** A point or direction on screen or in a plane. */
export type Flat = readonly [number, number];
/** A point or direction in space. */
export type Solid = readonly [number, number, number];

export const add = ([ax, ay, az]: Solid, [bx, by, bz]: Solid): Solid => [ax + bx, ay + by, az + bz];
export const subtract = ([ax, ay, az]: Solid, [bx, by, bz]: Solid): Solid => [ax - bx, ay - by, az - bz];
export const scale = ([x, y, z]: Solid, factor: number): Solid => [x * factor, y * factor, z * factor];
export const dot = ([ax, ay, az]: Solid, [bx, by, bz]: Solid) => ax * bx + ay * by + az * bz;
export const cross = ([ax, ay, az]: Solid, [bx, by, bz]: Solid): Solid => [
  ay * bz - az * by,
  az * bx - ax * bz,
  ax * by - ay * bx,
];

/**
 * A rotation as its 3 by 3 matrix, row by row. Nine numbers compose and apply
 * with plain multiplication, far cheaper per point than angles.
 */
export type Rotation = readonly [number, number, number, number, number, number, number, number, number];

export const IDENTITY: Rotation = [1, 0, 0, 0, 1, 0, 0, 0, 1];

const RADIAN = Math.PI / 180;
const turn = (degrees: number) => [Math.cos(degrees * RADIAN), Math.sin(degrees * RADIAN)] as const;

/** A turn about the x axis in degrees, the same way round as CSS `rotateX`. */
export function rotateX(degrees: number): Rotation {
  const [c, s] = turn(degrees);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}

/** A turn about the y axis in degrees, the same way round as CSS `rotateY`. */
export function rotateY(degrees: number): Rotation {
  const [c, s] = turn(degrees);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}

/** A turn about the z axis in degrees, the same way round as CSS `rotateZ`. */
export function rotateZ(degrees: number): Rotation {
  const [c, s] = turn(degrees);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

/** `outer` after `inner`, as one rotation. */
export function multiply(outer: Rotation, inner: Rotation): Rotation {
  const [a, b, c, d, e, f, g, h, i] = outer;
  const [j, k, l, m, n, o, p, q, r] = inner;
  return [
    a * j + b * m + c * p,
    a * k + b * n + c * q,
    a * l + b * o + c * r,
    d * j + e * m + f * p,
    d * k + e * n + f * q,
    d * l + e * o + f * r,
    g * j + h * m + i * p,
    g * k + h * n + i * q,
    g * l + h * o + i * r,
  ];
}

/**
 * Rotations read like a CSS transform list: the last turns a point first and
 * the first turns it last.
 */
export const combine = (...rotations: readonly Rotation[]): Rotation => rotations.reduce(multiply, IDENTITY);

export function rotate([a, b, c, d, e, f, g, h, i]: Rotation, [x, y, z]: Solid): Solid {
  return [a * x + b * y + c * z, d * x + e * y + f * z, g * x + h * y + i * z];
}

/** Where a part sits: turned by `rotation`, then moved to `position`. */
export type Pose = { readonly position: Solid; readonly rotation: Rotation };

export const REST: Pose = { position: [0, 0, 0], rotation: IDENTITY };

export const place = ({ position, rotation }: Pose, point: Solid): Solid => add(rotate(rotation, point), position);

/** A pose inside `outer`, such as a lid on its base, as one pose in `outer`'s space. */
export const compose = (outer: Pose, inner: Pose): Pose => ({
  position: place(outer, inner.position),
  rotation: multiply(outer.rotation, inner.rotation),
});
