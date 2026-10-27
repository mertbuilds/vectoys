import {
  camera,
  combine,
  compose,
  draw,
  footprint,
  rotate,
  rotateX,
  rotateY,
  rotateZ,
  slab,
  type Light,
  type Part,
  type Pose,
  type ScreenRect,
} from "@vinena/vectoys";

// A card the size of a playing card, 64 by 88 mm, cut from 2 mm board with
// 4 mm corners and its edges rounded, so it shows a thin edge as it turns.
// Sizes are millimetres at SCALE scene units each, in a scene 100 wide and
// 120 tall, so the card has room to tilt and turn.
const SCALE = 0.85;
const mm = (value: number) => value * SCALE;

export const WIDTH = mm(64);
export const HEIGHT = mm(88);
export const THICKNESS = mm(2);
const ROUND = mm(4);
const EDGE = THICKNESS / 2;
const LIFT = 0.02;
const STEP = 0.5;

/** Each face's flat inside the rounded edge, x across and y down from the card's top, for laying live content on with `Screen`. */
export const FACE: ScreenRect = { x: -WIDTH / 2 + EDGE, y: -HEIGHT / 2 + EDGE, width: WIDTH - 2 * EDGE, height: HEIGHT - 2 * EDGE, z: LIFT };
/** The face's corner radius, inside the edge's. */
export const FACE_ROUND = ROUND - EDGE;

/**
 * How the card stands, in degrees: `flip` about its own upright axis, 0 for
 * the front and 180 for the back, and `yaw` and `pitch` the small tilt
 * toward a pointer.
 */
export type Turn = { flip?: number; yaw?: number; pitch?: number };

/**
 * Upright, the card's own z turns to the model's y, toward the eye, and its
 * y, down the card, to the model's -z. It flips about its own y first, then
 * tilts in the model, so a tilt stays the same way round on either face. Its
 * middle, half way through its thickness, is the model's origin.
 */
function bodyPose({ flip = 0, yaw = 0, pitch = 0 }: Turn): Pose {
  const rotation = combine(rotateX(pitch), rotateZ(yaw), rotateX(-90), rotateY(flip));
  return { position: rotate(rotation, [0, 0, THICKNESS / 2]), rotation };
}

// The back is the slab's bottom. Turned half round about the card's upright
// axis, content laid on it reads the right way once the card is flipped.
const BACK: Pose = { position: [0, 0, -THICKNESS], rotation: rotateY(180) };

// A light a little more from the eye than the engine's, so a face seen
// straight on or tilted a little keeps the page's colour, and only the edge
// and a face turned well away darken.
const LIGHT: Light = { direction: [-0.25, -0.4, 0.9], ambient: 0.4 };

const card = (pose: Pose): Part =>
  slab({ name: "card", box: [-WIDTH / 2, -HEIGHT / 2, WIDTH / 2, HEIGHT / 2], radii: [ROUND, ROUND], thickness: THICKNESS, edge: EDGE, step: STEP, pose });

/** The card as the eye sees it: the eye, the faces drawn, each face's pose for its content and the shadow under it. */
export function seen(turn: Turn = {}) {
  const eye = camera({ width: 100, height: 120, perspective: 300, pitch: -6, anchorY: 56 });
  const pose = bodyPose(turn);
  const scene = [card(pose)];
  const ground = (spread: number, ahead: number) => footprint(scene, eye, { gap: mm(10), spread, ahead });
  const [contact, far] = [ground(mm(1.5), 0), ground(mm(7), mm(4))];
  return {
    camera: eye,
    drawn: draw(scene, eye, { light: LIGHT }),
    front: pose,
    back: compose(pose, BACK),
    shadow: contact.facing ? { contact: contact.d, ground: far.d } : null,
  };
}

export type View = ReturnType<typeof seen>;
