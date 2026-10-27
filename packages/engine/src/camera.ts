import { combine, dot, rotate, rotateX, rotateY, rotateZ, subtract, type Flat, type Rotation, type Solid } from "./vector.ts";

/**
 * A scene `width` by `height`, in the units the SVG viewBox and the CSS use.
 * An eye sits `perspective` in front of it, level with the vanishing point
 * (`originX`, `originY`), as CSS `perspective` and `perspective-origin` put
 * it. The model stands `back` behind the scene at (`anchorX`, `anchorY`) and
 * turns by `yaw` about its up axis, `pitch` toward or away from the eye and
 * `roll` about the line of sight, all in degrees.
 */
export type CameraOptions = {
  width?: number;
  height: number;
  perspective: number;
  originX?: number;
  originY?: number;
  anchorX?: number;
  anchorY?: number;
  back?: number;
  yaw?: number;
  pitch?: number;
  roll?: number;
};

export type Camera = Required<CameraOptions> & {
  /** Turns a direction of the model into the scene's axes. */
  rotation: Rotation;
  toView: (point: Solid) => Solid;
  project: (point: Solid) => Flat;
  facesEye: (point: Solid, normal: Solid) => boolean;
};

// The model's axes: x across, y toward the front and z up. The scene's
// axes, as CSS has them: x right, y down and z toward the eye. Standing
// upright the model's front faces the eye, which is CSS `rotateX(90deg)`.
const UPRIGHT = rotateX(90);

/**
 * A perspective camera on a model. The model turns as CSS turns an element
 * styled `translateZ(-back) rotateZ(roll) rotateX(pitch) rotateY(yaw)
 * rotateX(90deg)` at the anchor, so a live element laid over the drawing
 * lines up with it.
 */
export function camera(options: CameraOptions): Camera {
  const { width = 100, height, perspective } = options;
  const settings = {
    width,
    height,
    perspective,
    originX: options.originX ?? width / 2,
    originY: options.originY ?? height / 2,
    anchorX: options.anchorX ?? width / 2,
    anchorY: options.anchorY ?? height / 2,
    back: options.back ?? 0,
    yaw: options.yaw ?? 0,
    pitch: options.pitch ?? 0,
    roll: options.roll ?? 0,
  };
  const { originX, originY, anchorX, anchorY, back } = settings;
  const rotation = combine(rotateZ(settings.roll), rotateX(settings.pitch), rotateY(settings.yaw), UPRIGHT);

  /** A point of the model in the scene, before perspective draws it in. */
  function toView(point: Solid): Solid {
    const [x, y, z] = rotate(rotation, point);
    return [anchorX + x, anchorY + y, z - back];
  }

  function project(point: Solid): Flat {
    const [x, y, z] = toView(point);
    const share = perspective / (perspective - z);
    return [originX + (x - originX) * share, originY + (y - originY) * share];
  }

  /** Whether a face through `point`, turned out along `normal`, faces the eye. */
  function facesEye(point: Solid, normal: Solid): boolean {
    return dot(rotate(rotation, normal), subtract([originX, originY, perspective], toView(point))) > 0;
  }

  return { ...settings, rotation, toView, project, facesEye };
}
