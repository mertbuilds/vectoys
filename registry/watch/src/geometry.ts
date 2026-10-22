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
  subtract,
  type Box,
  type Part,
  type Pose,
  type ScreenRect,
  type Solid,
} from "@vectoys/engine";

// A smartwatch: a case 38 by 45 mm and 10.7 mm thick, its corners rounded
// by 10.5 mm and its sides by 4 mm where they meet the front and the back.
// The glass covers the front inside that round, and the display sits 1.5 mm
// in from the glass's edge. Sizes are millimetres at SCALE scene units each,
// in a scene 100 square, so the watch and its band have room to turn.
const SCALE = 0.7;
const mm = (value: number) => value * SCALE;

export const WIDTH = mm(38);
export const HEIGHT = mm(45);
export const THICKNESS = mm(10.7);
const ROUND = mm(10.5);
const EDGE = mm(4);
const BEZEL = mm(1.5);
const GLASS_LIFT = 0.02;
// Points round a corner every half unit, few enough faces to redraw every frame.
const STEP = 0.5;

/** The display in the watch's front, x across and y down from its top edge, for laying live content on it with `Screen`. */
export const DISPLAY: ScreenRect = {
  x: -WIDTH / 2 + EDGE + BEZEL,
  y: -HEIGHT / 2 + EDGE + BEZEL,
  width: WIDTH - 2 * (EDGE + BEZEL),
  height: HEIGHT - 2 * (EDGE + BEZEL),
  z: GLASS_LIFT,
};
/** The display's corner radius, inside the glass's. */
export const DISPLAY_ROUND = ROUND - EDGE - BEZEL;

// The crown, 6.8 mm across, stands 2.6 mm proud of the right side 7 mm above
// its middle, and the side button, 2.4 by 10 mm, 0.8 mm proud 8 mm below.
// Both start 0.8 mm inside the side, where its round edge falls away.
const CROWN = mm(3.4);
const CROWN_PROUD = mm(2.6);
const CROWN_Y = mm(-7);
const BUTTON = mm(1.2);
const BUTTON_LENGTH = mm(10);
const BUTTON_PROUD = mm(0.8);
const BUTTON_Y = mm(8);
const SUNK = mm(0.8);

// The sensor on the back, 26 mm across and 1.2 mm proud.
const SENSOR = mm(13);
const SENSOR_HEIGHT = mm(1.2);

// The band: straps 22 mm wide and 3 mm thick leave the case's top and bottom
// in links 7 mm long, each bent a little further back than the one before,
// as a band does round a wrist. The links overlap by 0.4 mm so the bends
// leave no gaps.
const BAND = mm(22);
const BAND_THICKNESS = mm(3);
const LINK = mm(7);
const OVERLAP = mm(0.4);
const BENDS = [4, 8, 12, 15, 17, 19] as const;

/** A box about (x, y), `half` each way across and `down` each way up and down. */
const around = (x: number, y: number, half: number, down = half): Box => [x - half, y - down, x + half, y + down];

/** A rounded slab stood out of the right side along x, as the crown and the button are. */
function onSide(name: string, box: Box, proud: number, order: number, children: readonly Part[] = []): Part {
  return slab({
    name,
    box,
    radii: [Math.min(box[2] - box[0], box[3] - box[1]) / 2, Math.min(box[2] - box[0], box[3] - box[1]) / 2],
    thickness: proud + SUNK,
    step: STEP,
    order,
    pose: { position: [WIDTH / 2 + proud, 0, -THICKNESS / 2], rotation: rotateY(90) },
    children,
  });
}

/**
 * The pose of one link inside the link before it, bent `bend` degrees back
 * about the middle of the joint between them, `toward` 1 for the top strap
 * and -1 for the bottom.
 */
function joint(bend: number, toward: 1 | -1): Pose {
  const rotation = rotateX(toward * bend);
  const hinge: Solid = [0, -toward * (LINK - OVERLAP), -BAND_THICKNESS / 2];
  return { position: subtract(hinge, rotate(rotation, [0, 0, -BAND_THICKNESS / 2])), rotation };
}

/** One strap as a chain of links, each a child of the one before so its bends add up. */
function strap(toward: 1 | -1, order: number): Part {
  const name = toward > 0 ? "strap-top" : "strap-bottom";
  const link = (index: number, pose: Pose): Part => {
    const next = BENDS[index + 1];
    const last = next === undefined;
    // The last link ends round, as a strap's tip does, as far as the link's length allows.
    const end = last ? Math.min(BAND / 2, LINK) : mm(1);
    const box: Box = toward > 0 ? [-BAND / 2, -LINK, BAND / 2, 0] : [-BAND / 2, 0, BAND / 2, LINK];
    return slab({
      name: `${name}-${index}`,
      box,
      radii: toward > 0 ? [end, 0] : [0, end],
      thickness: BAND_THICKNESS,
      // A chamfer reads as a soft edge at this size, with half the faces of a round one.
      edge: mm(0.8),
      bevel: "chamfer",
      step: STEP,
      order,
      pose,
      children: next === undefined ? [] : [link(index + 1, joint(next, toward))],
    });
  };
  // The strap leaves the case from inside its edge, in the middle of its thickness.
  const root: Pose = {
    position: [0, toward * (-HEIGHT / 2 + mm(1.5)), -THICKNESS / 2 + BAND_THICKNESS / 2],
    rotation: rotateX(toward * BENDS[0]),
  };
  return link(0, root);
}

/**
 * The watch's parts for one eye. The sorter draws parts far to near by their
 * middles, which a part offset across another's face can get wrong, so the
 * crown, the button and the sensor take an `order` from whether the face
 * they stand on faces the eye. The straps bend back, so they take the
 * sensor's order too.
 */
function parts(pose: Pose, facing: (point: Solid, normal: Solid) => boolean): Part[] {
  const right = facing([WIDTH / 2, 0, -THICKNESS / 2], [1, 0, 0]) ? 1 : -1;
  const back = facing([0, 0, -THICKNESS], [0, 0, -1]) ? 1 : -1;
  return [
    slab({
      name: "case",
      box: around(0, 0, WIDTH / 2, HEIGHT / 2),
      radii: [ROUND, ROUND],
      thickness: THICKNESS,
      edge: EDGE,
      step: STEP,
      pose,
      children: [
        plate({
          name: "glass",
          box: around(0, 0, WIDTH / 2 - EDGE, HEIGHT / 2 - EDGE),
          radii: [ROUND - EDGE, ROUND - EDGE],
          lift: GLASS_LIFT,
          role: "glass",
          step: STEP,
        }),
        onSide("crown", around(0, CROWN_Y, CROWN), CROWN_PROUD, right, [
          plate({ name: "crown-face", box: around(0, CROWN_Y, CROWN * 0.7), radii: [CROWN * 0.7, CROWN * 0.7], role: "face", step: STEP, order: right }),
        ]),
        onSide("button", around(0, BUTTON_Y, BUTTON, BUTTON_LENGTH / 2), BUTTON_PROUD, right),
        // Turned over, so its top faces out of the back.
        slab({
          name: "sensor",
          box: around(0, 0, SENSOR),
          radii: [SENSOR, SENSOR],
          thickness: SENSOR_HEIGHT,
          edge: SENSOR_HEIGHT / 2,
          step: STEP,
          order: back,
          pose: { position: [0, 0, -THICKNESS - SENSOR_HEIGHT], rotation: rotateX(180) },
        }),
        strap(1, back),
        strap(-1, back),
      ],
    }),
  ];
}

/**
 * How the watch turns, in degrees: `yaw` about its up axis, `pitch` towards
 * or away from the eye and `roll` round in its own plane, clockwise.
 */
export type Turn = { yaw?: number; pitch?: number; roll?: number };

/**
 * Upright, the watch's front faces the eye: its own z turns to the model's y
 * and its y, down the display, to the model's -z. Its middle is the model's
 * origin, and it rolls about the axis out of its front. The watch rolls and
 * not the camera, so the ground and the shadow on it stay level.
 */
function casePose(roll: number): Pose {
  const spin = rotateY(roll);
  return { position: rotate(spin, [0, THICKNESS / 2, 0]), rotation: multiply(spin, rotateX(-90)) };
}

/** A three-quarter view from a little above, turned so the crown shows. */
export const TURN = { yaw: -28, pitch: -12, roll: 0 } as const;

/** The watch as one eye sees it: the eye, the parts drawn, the display's pose and the shadow under it. */
export function seen({ yaw = TURN.yaw, pitch = TURN.pitch, roll = TURN.roll }: Turn = {}) {
  const eye = camera({ width: 100, height: 100, perspective: 260, yaw, pitch });
  const pose = casePose(roll);
  const scene = parts(pose, (point, normal) => eye.facesEye(place(pose, point), rotate(pose.rotation, normal)));
  const ground = (spread: number, ahead: number) => footprint(scene, eye, { gap: mm(10), spread, ahead });
  const [contact, far] = [ground(mm(1), 0), ground(mm(6), mm(3))];
  return {
    camera: eye,
    scene,
    drawn: draw(scene, eye),
    // The glass lies on the case with no turn of its own.
    glass: pose,
    // Seen from under the ground, there is no shadow to draw.
    shadow: contact.facing ? { contact: contact.d, ground: far.d } : null,
  };
}

export type View = ReturnType<typeof seen>;
