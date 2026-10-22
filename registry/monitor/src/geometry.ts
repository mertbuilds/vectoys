import {
  IDENTITY,
  camera,
  compose,
  draw,
  footprint,
  plate,
  rotateX,
  slab,
  type Part,
  type Pose,
  type ScreenRect,
} from "@vectoys/engine";

// A 27 inch 16:9 monitor: a panel 612 by 349.5 mm and 16 mm thick, its
// corners rounded by 6 mm and its edges by 2 mm, with a display 600 by
// 337.5 mm in a 6 mm bezel. A block 100 mm square and 20 mm deep on the
// panel's back holds it on a neck 60 mm wide and 14 mm deep, which stands on
// a foot 240 by 190 mm and 8 mm thick. The panel's middle is 285 mm over the
// desk and it tilts about the block's back. Sizes are millimetres at SCALE
// scene units each, in a scene 100 by 90, so the monitor has room to turn.
const SCALE = 0.125;
const mm = (value: number) => value * SCALE;

export const WIDTH = mm(612);
export const HEIGHT = mm(349.5);
export const THICKNESS = mm(16);
const ROUND = mm(6);
const EDGE = mm(2);
const BEZEL = mm(6);
const GLASS_LIFT = 0.02;
const MOUNT = mm(100);
const MOUNT_DEPTH = mm(20);
const NECK_WIDTH = mm(60);
const NECK_DEPTH = mm(14);
const FOOT_WIDTH = mm(240);
const FOOT_DEPTH = mm(190);
const FOOT_THICKNESS = mm(8);
const FOOT_ROUND = mm(24);
// The foot reaches 60 mm in front of the panel's face.
const FOOT_FRONT = mm(60);
const PIVOT_HEIGHT = mm(285);
const NECK_TOP = PIVOT_HEIGHT + mm(40);
// The model's middle, half way up from the desk to the panel's top, so it turns about its middle.
const MIDDLE = (PIVOT_HEIGHT + HEIGHT / 2) / 2;
// Points round a corner every half unit, few enough faces to redraw every frame.
const STEP = 0.5;

/** The display in the panel's face, x across and y down from its top edge, for laying live content on it with `Screen`. */
export const DISPLAY: ScreenRect = {
  x: -WIDTH / 2 + BEZEL,
  y: -HEIGHT / 2 + BEZEL,
  width: WIDTH - 2 * BEZEL,
  height: HEIGHT - 2 * BEZEL,
  z: GLASS_LIFT,
};

/** Which way the eye looks at the monitor, for the orders that sort its parts. */
type Side = { back: boolean; above: boolean };

/**
 * The panel, turned about the block's back by `tilt` degrees, its top going
 * back. Its own z is out of its face and its y runs down it, as `DISPLAY` is
 * given.
 */
function panelPose(tilt: number): Pose {
  const pivot: Pose = { position: [0, -THICKNESS - MOUNT_DEPTH, PIVOT_HEIGHT - MIDDLE], rotation: rotateX(tilt) };
  const upright: Pose = { position: [0, THICKNESS + MOUNT_DEPTH, 0], rotation: rotateX(-90) };
  return compose(pivot, upright);
}

function panel(tilt: number, { back }: Side): Part {
  return slab({
    name: "panel",
    box: [-WIDTH / 2, -HEIGHT / 2, WIDTH / 2, HEIGHT / 2],
    radii: [ROUND, ROUND],
    thickness: THICKNESS,
    edge: EDGE,
    step: STEP,
    pose: panelPose(tilt),
    children: [
      plate({
        name: "glass",
        box: [-WIDTH / 2 + EDGE, -HEIGHT / 2 + EDGE, WIDTH / 2 - EDGE, HEIGHT / 2 - EDGE],
        radii: [ROUND - EDGE, ROUND - EDGE],
        lift: GLASS_LIFT,
        role: "glass",
        step: STEP,
      }),
      // Turned over, so its top faces out of the back.
      slab({
        name: "mount",
        box: [-MOUNT / 2, -MOUNT / 2, MOUNT / 2, MOUNT / 2],
        radii: [mm(10), mm(10)],
        thickness: MOUNT_DEPTH,
        edge: mm(3),
        step: STEP,
        order: back ? 1 : -1,
        pose: { position: [0, 0, -THICKNESS - MOUNT_DEPTH], rotation: rotateX(180) },
      }),
    ],
  });
}

/**
 * The monitor's parts for one eye. The sorter draws parts far to near by
 * their middles, which the stand's long and flat parts can get wrong, so
 * each takes an `order`: the neck and the block behind the panel when its
 * face is seen and in front of it when its back is, and the foot under
 * everything while the eye is over the desk.
 */
function parts(tilt: number, side: Side): Part[] {
  const behind = -THICKNESS - MOUNT_DEPTH;
  return [
    slab({
      name: "foot",
      box: [-FOOT_WIDTH / 2, FOOT_FRONT - FOOT_DEPTH, FOOT_WIDTH / 2, FOOT_FRONT],
      radii: [FOOT_ROUND, FOOT_ROUND],
      thickness: FOOT_THICKNESS,
      edge: mm(3),
      step: STEP,
      order: side.above ? -2 : 2,
      pose: { position: [0, 0, FOOT_THICKNESS - MIDDLE], rotation: IDENTITY },
    }),
    // Stood up, its own z out of its front towards the panel's back.
    slab({
      name: "neck",
      box: [-NECK_WIDTH / 2, 0, NECK_WIDTH / 2, NECK_TOP - FOOT_THICKNESS],
      radii: [mm(6), 0],
      thickness: NECK_DEPTH,
      edge: mm(3),
      step: STEP,
      order: side.back ? 1 : -1,
      pose: { position: [0, behind, NECK_TOP - MIDDLE], rotation: rotateX(-90) },
    }),
    panel(tilt, side),
  ];
}

/**
 * How the monitor turns, in degrees: `yaw` about its up axis and `pitch`
 * towards or away from the eye, and `tilt` of the panel on its stand, its
 * top going back for more.
 */
export type Turn = { yaw?: number; pitch?: number; tilt?: number };

/** A three-quarter view from a little above, the panel tilted back a touch. */
export const TURN = { yaw: -24, pitch: -10, tilt: 5 } as const;

/** The monitor as one eye sees it: the eye, the parts drawn, the glass's pose and the shadow under it. */
export function seen({ yaw = TURN.yaw, pitch = TURN.pitch, tilt = TURN.tilt }: Turn = {}) {
  const eye = camera({ width: 100, height: 90, perspective: 300, yaw, pitch });
  const back = eye.facesEye([0, -THICKNESS, PIVOT_HEIGHT - MIDDLE], [0, -Math.cos((tilt * Math.PI) / 180), -Math.sin((tilt * Math.PI) / 180)]);
  const above = eye.facesEye([0, 0, FOOT_THICKNESS - MIDDLE], [0, 0, 1]);
  const scene = parts(tilt, { back, above });
  const ground = (spread: number, ahead: number) => footprint(scene, eye, { gap: 0.05, spread, ahead });
  const [contact, far] = [ground(mm(4), 0), ground(mm(30), mm(20))];
  return {
    camera: eye,
    scene,
    drawn: draw(scene, eye),
    // The glass lies on the panel with no turn of its own.
    glass: panelPose(tilt),
    // Seen from under the desk, there is no shadow to draw.
    shadow: contact.facing ? { contact: contact.d, ground: far.d } : null,
  };
}

export type View = ReturnType<typeof seen>;
