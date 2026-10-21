import {
  IDENTITY,
  camera,
  compose,
  draw,
  footprint,
  multiply,
  place,
  plate,
  poses,
  rotate,
  rotateX,
  rotateY,
  rotateZ,
  slab,
  type Box,
  type Part,
  type Pose,
  type ScreenRect,
  type Solid,
} from "@vectoys/engine";

// A tablet with an 11 inch display: 178.5 by 247.6 mm upright and 5.9 mm
// thick, its corners rounded by 18 mm and its flat sides by 0.6 mm where they
// meet the front and the back. The glass covers the front inside that round,
// and the display sits in a bezel 8 mm wide all round from the outside.
// Sizes are millimetres at SCALE scene units each, in a scene 100 square, so
// the tablet has room to turn any way, upright or on its side.
const SCALE = 0.27;
const mm = (value: number) => value * SCALE;

export const WIDTH = mm(178.5);
export const HEIGHT = mm(247.6);
export const THICKNESS = mm(5.9);
const ROUND = mm(18);
const EDGE = mm(0.6);
const BEZEL = mm(7.4);
const GLASS_LIFT = 0.02;
// Points round a corner every half unit: round enough at any size a page
// shows the tablet, with few enough faces to redraw every frame.
const STEP = 0.5;
const INSET = EDGE + BEZEL;

/** The display's corner radius, inside the glass's. */
export const DISPLAY_ROUND = ROUND - INSET;

// The front camera, 2.6 mm across, sits in the middle of the bezel on the
// right long side upright, which is the top on its side.
const FRONT_CAMERA = mm(1.3);

// The camera bump on the back: 27 mm square with 9 mm corners, 1.1 mm proud,
// 7 mm in from the top and from the side that is on the left from behind,
// with a lens 0.6 mm proud of it, a smaller one under it and the flash.
const BUMP = mm(27);
const BUMP_ROUND = mm(9);
const BUMP_HEIGHT = mm(1.1);
const BUMP_MARGIN = mm(7);
const LENS_HEIGHT = mm(0.6);
const FLASH = mm(2.2);
const SPREAD = mm(6.2);
const BUMP_X = WIDTH / 2 - BUMP_MARGIN - BUMP / 2;
const BUMP_Y = -HEIGHT / 2 + BUMP_MARGIN + BUMP / 2;

/** A square box about (x, y), `radius` each way. */
const around = (x: number, y: number, radius: number): Box => [x - radius, y - radius, x + radius, y + radius];

/** A lens in its ring, standing on the bump. */
function lens(index: number, x: number, y: number, [ring, glass]: readonly [number, number], order: number): Part {
  return slab({
    name: `lens-${index}`,
    box: around(0, 0, ring),
    radii: [ring, ring],
    thickness: LENS_HEIGHT,
    step: STEP,
    order,
    pose: { position: [x, y, LENS_HEIGHT], rotation: IDENTITY },
    children: [plate({ name: `lens-${index}-glass`, box: around(0, 0, glass), radii: [glass, glass], role: "lens", step: STEP, order })],
  });
}

/**
 * The tablet's parts for one eye, upright in its own frame. The sorter draws
 * parts far to near by their middles, which a part offset across another's
 * face can get wrong, so the bump takes an `order` from whether the back
 * faces the eye, and the front camera always draws after the glass it sits
 * on.
 */
function parts(pose: Pose, facing: (point: Solid, normal: Solid) => boolean): Part[] {
  const back = facing([BUMP_X, BUMP_Y, -THICKNESS], [0, 0, -1]);
  const [bumpOrder, onBump] = back ? [1, 2] : [-1, -1];
  return [
    slab({
      name: "body",
      box: [-WIDTH / 2, -HEIGHT / 2, WIDTH / 2, HEIGHT / 2],
      radii: [ROUND, ROUND],
      thickness: THICKNESS,
      edge: EDGE,
      step: STEP,
      pose,
      children: [
        plate({
          name: "glass",
          box: [-WIDTH / 2 + EDGE, -HEIGHT / 2 + EDGE, WIDTH / 2 - EDGE, HEIGHT / 2 - EDGE],
          radii: [ROUND - EDGE, ROUND - EDGE],
          lift: GLASS_LIFT,
          role: "glass",
          step: STEP,
        }),
        plate({
          name: "front-camera",
          box: around(WIDTH / 2 - EDGE - BEZEL / 2, 0, FRONT_CAMERA),
          radii: [FRONT_CAMERA, FRONT_CAMERA],
          lift: 2 * GLASS_LIFT,
          role: "camera",
          step: STEP,
          order: 1,
        }),
        // Turned over, so its top faces out of the back; its y runs up the tablet.
        slab({
          name: "bump",
          box: around(0, 0, BUMP / 2),
          radii: [BUMP_ROUND, BUMP_ROUND],
          thickness: BUMP_HEIGHT,
          edge: BUMP_HEIGHT / 3,
          step: STEP,
          order: bumpOrder,
          pose: { position: [BUMP_X, BUMP_Y, -THICKNESS - BUMP_HEIGHT], rotation: rotateX(180) },
          children: [
            lens(0, -SPREAD / 2, SPREAD, [mm(6), mm(4.4)], onBump),
            lens(1, -SPREAD / 2, -SPREAD, [mm(4.6), mm(3.3)], onBump),
            plate({ name: "flash", box: around(SPREAD, -SPREAD, FLASH), radii: [FLASH, FLASH], role: "flash", step: STEP, order: onBump }),
          ],
        }),
      ],
    }),
  ];
}

/** Upright, or on its side with the front camera at the top. */
export type Orientation = "portrait" | "landscape";

/**
 * How the tablet turns, in degrees: `yaw` about its up axis, `pitch` towards
 * or away from the eye and `roll` round in its own plane, clockwise.
 */
export type Turn = { yaw?: number; pitch?: number; roll?: number };

/**
 * Upright, the tablet's front faces the eye: its own z turns to the model's y
 * and its y, down the display, to the model's -z. Its middle is the model's
 * origin, and it rolls about the axis out of its front. The tablet rolls and
 * not the camera, so the ground and the shadow on it stay level.
 */
function bodyPose(roll: number): Pose {
  const spin = rotateY(roll);
  return { position: rotate(spin, [0, THICKNESS / 2, 0]), rotation: multiply(spin, rotateX(-90)) };
}

/**
 * The display, x across and y down from its top edge as the content lays out,
 * for `Screen`. On its side the tablet turns a quarter anticlockwise, so the
 * content turns a quarter back within the glass to stay level.
 */
export function display(orientation: Orientation): { rect: ScreenRect; turn: Pose } {
  const [across, down] = orientation === "landscape" ? [HEIGHT, WIDTH] : [WIDTH, HEIGHT];
  return {
    rect: { x: -across / 2 + INSET, y: -down / 2 + INSET, width: across - 2 * INSET, height: down - 2 * INSET, z: GLASS_LIFT },
    turn: { position: [0, 0, 0], rotation: rotateZ(orientation === "landscape" ? 90 : 0) },
  };
}

/** A three-quarter view from a little above. */
export const TURN = { yaw: -24, pitch: -10, roll: 0 } as const;

/** The tablet as one eye sees it: the eye, the parts drawn, the display's pose and rectangle and the shadow under it. */
export function seen({ yaw = TURN.yaw, pitch = TURN.pitch, roll = TURN.roll }: Turn = {}, orientation: Orientation = "portrait") {
  const eye = camera({ width: 100, height: 100, perspective: 300, yaw, pitch });
  const pose = bodyPose(roll + (orientation === "landscape" ? -90 : 0));
  const scene = parts(pose, (point, normal) => eye.facesEye(place(pose, point), rotate(pose.rotation, normal)));
  const ground = (spread: number, ahead: number) => footprint(scene, eye, { gap: mm(14), spread, ahead });
  const [contact, far] = [ground(mm(1.5), 0), ground(mm(9), mm(4))];
  const { rect, turn } = display(orientation);
  return {
    camera: eye,
    scene,
    drawn: draw(scene, eye),
    display: { pose: compose(poses(scene).get("glass")!, turn), rect },
    // Seen from under the ground, there is no shadow to draw.
    shadow: contact.facing ? { contact: contact.d, ground: far.d } : null,
  };
}

export type View = ReturnType<typeof seen>;
