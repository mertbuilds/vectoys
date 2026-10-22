import {
  IDENTITY,
  camera,
  draw,
  footprint,
  multiply,
  place,
  plate,
  rotate,
  rotateX,
  rotateY,
  slab,
  type Box,
  type Part,
  type Pose,
  type ScreenRect,
  type Solid,
} from "@vectoys/engine";

// A modern flagship phone: 71.5 by 149.6 mm and 8.3 mm thick, its corners
// rounded by 10 mm and its sides by 2.5 mm where they meet the front and the
// back. The glass covers the front inside that round, and the display sits
// 1.8 mm in from the glass's edge. Sizes are millimetres at SCALE scene units
// each, in a scene 100 square, so the phone has room to turn any way.
const SCALE = 0.42;
const mm = (value: number) => value * SCALE;

export const WIDTH = mm(71.5);
export const HEIGHT = mm(149.6);
export const THICKNESS = mm(8.3);
const ROUND = mm(10);
const EDGE = mm(2.5);
const BEZEL = mm(1.8);
const GLASS_LIFT = 0.02;
// Points round a corner every half unit: round enough at any size a page
// shows the phone, with few enough faces to redraw every frame.
const STEP = 0.5;

/** The display in the phone's front, x across and y down from its top edge, for laying live content on it with `Screen`. */
export const DISPLAY: ScreenRect = {
  x: -WIDTH / 2 + EDGE + BEZEL,
  y: -HEIGHT / 2 + EDGE + BEZEL,
  width: WIDTH - 2 * (EDGE + BEZEL),
  height: HEIGHT - 2 * (EDGE + BEZEL),
  z: GLASS_LIFT,
};
/** The display's corner radius, inside the glass's. */
export const DISPLAY_ROUND = ROUND - EDGE - BEZEL;

// The side buttons stand 0.6 mm proud and 2.6 mm wide, centred on the flat of
// the side, each given as (mm down from the top, mm long): an action button
// and the volume pair on the left, the power button on the right.
const PROUD = mm(0.6);
const BUTTON = mm(2.6);
const LEFT_BUTTONS = [
  [25, 7],
  [40, 13],
  [56, 13],
] as const;
const RIGHT_BUTTONS = [[42, 18]] as const;

// The camera bump on the back: 31 mm square with 8 mm corners, 1.3 mm proud,
// 5 mm in from the top and from the side that is on the left from behind.
// Two lenses stand 0.8 mm proud of it in rings 11.6 mm across, corner to
// corner, with the flash and a microphone in the other corners.
const BUMP = mm(31);
const BUMP_ROUND = mm(8);
const BUMP_HEIGHT = mm(1.3);
const BUMP_MARGIN = mm(5);
const LENS_HEIGHT = mm(0.8);
const RING = mm(5.8);
const LENS = mm(4.3);
const FLASH = mm(2.4);
const MIC = mm(0.6);
const SPREAD = mm(7.2);

/** A square box about (x, y), `radius` each way. */
const around = (x: number, y: number, radius: number): Box => [x - radius, y - radius, x + radius, y + radius];

/** A button on one side, standing out from it along x. */
function button(side: 1 | -1, index: number, [from, length]: readonly [number, number], order: number): Part {
  const top = -HEIGHT / 2 + mm(from);
  return slab({
    name: `button-${side > 0 ? "right" : "left"}-${index}`,
    box: [-BUTTON / 2, top, BUTTON / 2, top + mm(length)],
    radii: [BUTTON / 2, BUTTON / 2],
    thickness: PROUD,
    step: STEP,
    order,
    pose: { position: [side * (WIDTH / 2 + PROUD), 0, -THICKNESS / 2], rotation: rotateY(side * 90) },
  });
}

/** A lens in its ring, standing on the bump. */
function lens(index: number, x: number, y: number, order: number): Part {
  return slab({
    name: `lens-${index}`,
    box: around(0, 0, RING),
    radii: [RING, RING],
    thickness: LENS_HEIGHT,
    step: STEP,
    order,
    pose: { position: [x, y, LENS_HEIGHT], rotation: IDENTITY },
    children: [plate({ name: `lens-${index}-glass`, box: around(0, 0, LENS), radii: [LENS, LENS], role: "lens", step: STEP, order })],
  });
}

const BUMP_X = WIDTH / 2 - BUMP_MARGIN - BUMP / 2;
const BUMP_Y = -HEIGHT / 2 + BUMP_MARGIN + BUMP / 2;

/**
 * The phone's parts for one eye. The sorter draws parts far to near by their
 * middles, which a part offset across another's face can get wrong, so the
 * bump and the buttons take an `order` from whether the face they stand on
 * faces the eye: in front of the body when it does, behind it when not.
 */
function parts(pose: Pose, facing: (point: Solid, normal: Solid) => boolean): Part[] {
  const back = facing([BUMP_X, BUMP_Y, -THICKNESS], [0, 0, -1]);
  const [bumpOrder, onBump] = back ? [1, 2] : [-1, -1];
  const side = (sign: 1 | -1) => (facing([(sign * WIDTH) / 2, 0, -THICKNESS / 2], [sign, 0, 0]) ? 1 : -1);
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
        ...LEFT_BUTTONS.map((at, index) => button(-1, index, at, side(-1))),
        ...RIGHT_BUTTONS.map((at, index) => button(1, index, at, side(1))),
        // Turned over, so its top faces out of the back; its y runs up the phone.
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
            lens(0, -SPREAD, SPREAD, onBump),
            lens(1, SPREAD, -SPREAD, onBump),
            plate({ name: "flash", box: around(SPREAD, SPREAD, FLASH), radii: [FLASH, FLASH], role: "flash", step: STEP, order: onBump }),
            plate({ name: "mic", box: around(-SPREAD, -SPREAD, MIC), radii: [MIC, MIC], role: "mic", step: STEP, order: onBump }),
          ],
        }),
      ],
    }),
  ];
}

/**
 * How the phone turns, in degrees: `yaw` about its up axis, `pitch` towards
 * or away from the eye and `roll` round in its own plane, clockwise.
 */
export type Turn = { yaw?: number; pitch?: number; roll?: number };

/**
 * Upright, the phone's front faces the eye: its own z turns to the model's y
 * and its y, down the display, to the model's -z. Its middle is the model's
 * origin, and it rolls about the axis out of its front. The phone rolls and
 * not the camera, so the ground and the shadow on it stay level.
 */
function bodyPose(roll: number): Pose {
  const spin = rotateY(roll);
  return { position: rotate(spin, [0, THICKNESS / 2, 0]), rotation: multiply(spin, rotateX(-90)) };
}

/** A three-quarter view from a little above, turned so the power button shows. */
export const TURN = { yaw: -28, pitch: -10, roll: 0 } as const;

/** The phone as one eye sees it: the eye, the parts drawn, the display's pose and the shadow under it. */
export function seen({ yaw = TURN.yaw, pitch = TURN.pitch, roll = TURN.roll }: Turn = {}) {
  const eye = camera({ width: 100, height: 100, perspective: 260, yaw, pitch });
  const pose = bodyPose(roll);
  const scene = parts(pose, (point, normal) => eye.facesEye(place(pose, point), rotate(pose.rotation, normal)));
  const ground = (spread: number, ahead: number) => footprint(scene, eye, { gap: mm(12), spread, ahead });
  const [contact, far] = [ground(mm(1), 0), ground(mm(6), mm(3))];
  return {
    camera: eye,
    scene,
    drawn: draw(scene, eye),
    // The glass lies on the body with no turn of its own.
    glass: pose,
    // Seen from under the ground, there is no shadow to draw.
    shadow: contact.facing ? { contact: contact.d, ground: far.d } : null,
  };
}

export type View = ReturnType<typeof seen>;
