import {
  camera,
  draw,
  footprint,
  multiply,
  plate,
  rotate,
  rotateX,
  rotateY,
  slab,
  type Box,
  type Part,
  type Pose,
  type ScreenRect,
} from "@vectoys/engine";

// A browser window 1280 by 800 CSS pixels, drawn as a thin card 12 pixels
// thick with 12 pixel corners and edges rounded by 5. A bar 44 pixels tall
// runs across its top, with three dots 12 across on its left and an address
// pill 460 by 28 in its middle; the page fills the rest. Sizes are pixels at
// SCALE scene units each, in a scene 100 by 80, so the window has room to
// turn any way.
const SCALE = 0.06;
const px = (value: number) => value * SCALE;

export const WIDTH = px(1280);
export const HEIGHT = px(800);
export const THICKNESS = px(12);
const ROUND = px(12);
const EDGE = px(5);
const BAR = px(44);
const DOT = px(6);
const DOT_GAP = px(20);
const DOT_LEFT = px(22);
/** CSS pixels the address lays out across, as in a real bar. */
export const ADDRESS_VIEWPORT = 460;
const PILL_WIDTH = px(ADDRESS_VIEWPORT);
const PILL_HEIGHT = px(28);
const LIFT = 0.02;
// Points round a corner every half unit, few enough faces to redraw every frame.
const STEP = 0.5;

const TOP = -HEIGHT / 2 + EDGE;
const BAR_MIDDLE = TOP + (BAR - EDGE) / 2;

/** The page under the bar, x across and y down from its top edge, for laying live content on it with `Screen`. */
export const PAGE: ScreenRect = {
  x: -WIDTH / 2 + EDGE,
  y: -HEIGHT / 2 + BAR,
  width: WIDTH - 2 * EDGE,
  height: HEIGHT - BAR - EDGE,
  z: LIFT,
};
/** The page's bottom corners' radius, inside the window's. */
export const PAGE_ROUND = ROUND - EDGE;

/** The address pill in the bar, for laying the address on it with `Screen`. */
export const ADDRESS: ScreenRect = {
  x: -PILL_WIDTH / 2,
  y: BAR_MIDDLE - PILL_HEIGHT / 2,
  width: PILL_WIDTH,
  height: PILL_HEIGHT,
  z: 3 * LIFT,
};

/** A box about (x, y), `half` each way across and `down` each way up and down. */
const around = (x: number, y: number, half: number, down = half): Box => [x - half, y - down, x + half, y + down];

/**
 * The window's parts. The bar, its dots and its pill lie across only part of
 * the face, so their middles do not sort them over it: each takes an `order`
 * that draws it after what it lies on.
 */
function parts(pose: Pose): Part[] {
  const dot = (index: number) =>
    plate({
      name: `dot-${index}`,
      box: around(-WIDTH / 2 + DOT_LEFT + index * DOT_GAP, BAR_MIDDLE, DOT),
      radii: [DOT, DOT],
      lift: 2 * LIFT,
      role: "dot",
      step: STEP,
      order: 2,
    });
  return [
    slab({
      name: "window",
      box: [-WIDTH / 2, -HEIGHT / 2, WIDTH / 2, HEIGHT / 2],
      radii: [ROUND, ROUND],
      thickness: THICKNESS,
      edge: EDGE,
      step: STEP,
      pose,
      children: [
        plate({
          name: "bar",
          box: [-WIDTH / 2 + EDGE, TOP, WIDTH / 2 - EDGE, -HEIGHT / 2 + BAR],
          radii: [ROUND - EDGE, 0],
          lift: LIFT,
          role: "bar",
          step: STEP,
          order: 1,
        }),
        dot(0),
        dot(1),
        dot(2),
        plate({
          name: "address",
          box: around(0, BAR_MIDDLE, PILL_WIDTH / 2, PILL_HEIGHT / 2),
          radii: [PILL_HEIGHT / 2, PILL_HEIGHT / 2],
          lift: 2 * LIFT,
          role: "pill",
          step: STEP,
          order: 2,
        }),
      ],
    }),
  ];
}

/**
 * How the window turns, in degrees: `yaw` about its up axis, `pitch` towards
 * or away from the eye and `roll` round in its own plane, clockwise.
 */
export type Turn = { yaw?: number; pitch?: number; roll?: number };

/**
 * Where the window sits in a stack, in pixels of the window: `depth` behind
 * the stage's middle, along its own back, and `offset` across and down its
 * face. Windows on stages of one size laid over each other, each with the
 * same turn, then stand in one space and turn together.
 */
export type Place = { depth?: number; offset?: readonly [number, number] };

/**
 * Upright, the window faces the eye: its own z turns to the model's y and its
 * y, down the page, to the model's -z. It rolls about the axis out of its
 * face, and `Place` moves it in its own plane and back from it.
 */
function windowPose(roll: number, { depth = 0, offset = [0, 0] }: Place): Pose {
  const spin = rotateY(roll);
  const rotation = multiply(spin, rotateX(-90));
  const [x, y] = offset;
  return { position: rotate(spin, [px(x), THICKNESS / 2 - px(depth), -px(y)]), rotation };
}

/** A gentle three-quarter view from a little above, the way a landing page shows it. */
export const TURN = { yaw: -18, pitch: -8, roll: 0 } as const;

/** The window as one eye sees it: the eye, the parts drawn, the window's pose and the shadow under it. */
export function seen({ yaw = TURN.yaw, pitch = TURN.pitch, roll = TURN.roll }: Turn = {}, at: Place = {}) {
  const eye = camera({ width: 100, height: 80, perspective: 300, yaw, pitch });
  const pose = windowPose(roll, at);
  const scene = parts(pose);
  const ground = (spread: number, ahead: number) => footprint(scene, eye, { gap: px(120), spread, ahead });
  const [contact, far] = [ground(px(20), 0), ground(px(110), px(60))];
  return {
    camera: eye,
    scene,
    drawn: draw(scene, eye),
    window: pose,
    // Seen from under the ground, there is no shadow to draw.
    shadow: contact.facing ? { contact: contact.d, ground: far.d } : null,
  };
}

export type View = ReturnType<typeof seen>;
