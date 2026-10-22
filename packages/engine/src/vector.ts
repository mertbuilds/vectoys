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

/** A turn of `degrees` about any `axis`, the same way round as `rotateX` is about x. */
export function rotateAxis(axis: Solid, degrees: number): Rotation {
  const length = Math.hypot(...axis);
  const [x, y, z] = [axis[0] / length, axis[1] / length, axis[2] / length];
  const [c, s] = turn(degrees);
  const t = 1 - c;
  return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
}

/** A rotation as a unit quaternion (w, x, y, z), which blends smoothly where nine numbers do not. */
type Quaternion = readonly [number, number, number, number];

function quaternion([a, b, c, d, e, f, g, h, i]: Rotation): Quaternion {
  const trace = a + e + i;
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    return [s / 4, (h - f) / s, (c - g) / s, (d - b) / s];
  }
  if (a > e && a > i) {
    const s = Math.sqrt(1 + a - e - i) * 2;
    return [(h - f) / s, s / 4, (b + d) / s, (c + g) / s];
  }
  if (e > i) {
    const s = Math.sqrt(1 + e - a - i) * 2;
    return [(c - g) / s, (b + d) / s, s / 4, (f + h) / s];
  }
  const s = Math.sqrt(1 + i - a - e) * 2;
  return [(d - b) / s, (c + g) / s, (f + h) / s, s / 4];
}

function matrix([w, x, y, z]: Quaternion): Rotation {
  return [
    1 - 2 * (y * y + z * z),
    2 * (x * y - w * z),
    2 * (x * z + w * y),
    2 * (x * y + w * z),
    1 - 2 * (x * x + z * z),
    2 * (y * z - w * x),
    2 * (x * z - w * y),
    2 * (y * z + w * x),
    1 - 2 * (x * x + y * y),
  ];
}

/**
 * The rotation a share of the way from one to another, turning the short way
 * round at an even speed, as a tumbling die or a turning lid wants.
 */
export function slerp(from: Rotation, to: Rotation, share: number): Rotation {
  const p = quaternion(from);
  let q = quaternion(to);
  let cos = p[0] * q[0] + p[1] * q[1] + p[2] * q[2] + p[3] * q[3];
  // A quaternion and its negative are one rotation; the one nearer goes the short way.
  if (cos < 0) [q, cos] = [[-q[0], -q[1], -q[2], -q[3]], -cos];
  const angle = Math.acos(Math.min(cos, 1));
  // Nearly the same rotation: a straight blend is as good and does not divide by nought.
  const [kp, kq] = angle < 1e-6 ? [1 - share, share] : [Math.sin((1 - share) * angle) / Math.sin(angle), Math.sin(share * angle) / Math.sin(angle)];
  const blend: Quaternion = [kp * p[0] + kq * q[0], kp * p[1] + kq * q[1], kp * p[2] + kq * q[2], kp * p[3] + kq * q[3]];
  const length = Math.hypot(...blend);
  return matrix([blend[0] / length, blend[1] / length, blend[2] / length, blend[3] / length]);
}
