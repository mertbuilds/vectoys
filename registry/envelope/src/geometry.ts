import { camera, draw, footprint, multiply, place, plate, poses, rotateX, slab, type Flat, type Part, type Pose, type ScreenRect } from "@vinena/vectoys";

// A C6 envelope, 162 by 114 mm, seen from its back: the flap folds down over
// a pocket made of two side flaps and a bottom flap, and an A6 card, 148 by
// 105 mm, waits inside. Paper is 0.3 mm thick. In the envelope's own plane x
// runs across, y down from its middle and z out of its back towards the eye.
// Sizes are millimetres at SCALE scene units each.
const SCALE = 0.5;
const mm = (value: number) => value * SCALE;

export const WIDTH = mm(162);
export const HEIGHT = mm(114);
const PAPER = mm(0.3);
const FLAP = mm(68);
const CARD_WIDTH = mm(148);
const CARD_HEIGHT = mm(105);
// The card stands 5 mm down inside the envelope and rises 74 mm out of it.
const CARD_DOWN = mm(5);
export const RISE = mm(74);
// Where the side flaps meet and how high the bottom flap reaches, down from
// the middle. The bottom reaches a little over the sides' meeting so no gap
// shows between them, and the shut flap reaches well past both.
const SIDES_MEET = mm(-2);
const BOTTOM_REACH = mm(-6);

// Each sheet stands a little in front of the one before, so none tie on depth.
const BACK_Z = 0;
const CARD_Z = mm(0.8);
const POCKET_Z = mm(1.6);
const SHUT_Z = mm(2.2);

const [left, top, right, bottom] = [-WIDTH / 2, -HEIGHT / 2, WIDTH / 2, HEIGHT / 2];
const SIDE_LEFT: Flat[] = [
  [left, top],
  [0, SIDES_MEET],
  [left, bottom],
];
const SIDE_RIGHT: Flat[] = [
  [right, top],
  [right, bottom],
  [0, SIDES_MEET],
];
const BOTTOM: Flat[] = [
  [left, bottom],
  [0, BOTTOM_REACH],
  [right, bottom],
];
const FLAP_SHAPE: Flat[] = [
  [left, 0],
  [right, 0],
  [0, FLAP],
];

/** How far down the pocket's top edge is at `x`: under whichever flap reaches higher there. */
const pocketTop = (x: number) => {
  const across = Math.min(1, Math.abs(x) / right);
  return Math.min(top + (SIDES_MEET - top) * (1 - across), bottom + (BOTTOM_REACH - bottom) * (1 - across));
};

/** The card's face in the envelope's plane, for laying live content on it with `Screen`. */
export const CARD: ScreenRect = { x: -CARD_WIDTH / 2, y: 0, width: CARD_WIDTH, height: CARD_HEIGHT, z: 0.02 };

/** The envelope's front as the shut flap lies on it, on the back's face, for laying the opener over it with `Screen`. */
export const FRONT: ScreenRect = { x: left, y: top, width: WIDTH, height: HEIGHT, z: SHUT_Z - BACK_Z - PAPER };

/** How far the flap has turned, in degrees, and how far the card has risen, for an opening from 0 to 1. */
export function stages(open: number) {
  const share = Math.min(1, Math.max(0, open));
  return {
    // The flap swings over in the first part; the card rises once it is past upright.
    flap: 180 * Math.min(1, share / 0.55),
    rise: RISE * Math.min(1, Math.max(0, (share - 0.35) / 0.65)),
  };
}

/**
 * The card's outline of what shows over the pocket, as CSS `clip-path`
 * points in shares of the card, so live content inside the envelope stays
 * hidden behind its front.
 */
export function shown(rise: number): string {
  const cardTop = top + CARD_DOWN - rise;
  const share = (value: number) => `${Math.round(Math.min(1, Math.max(0, value)) * 1e4) / 100}%`;
  const edge = Array.from({ length: 33 }, (_, index) => {
    const across = index / 32;
    const x = -CARD_WIDTH / 2 + across * CARD_WIDTH;
    return `${share(1 - across)} ${share((pocketTop(x) - cardTop) / CARD_HEIGHT)}`;
  });
  return `polygon(0% 0%, 100% 0%, ${edge.join(", ")})`;
}

/**
 * The envelope's sheets. They all but lie in one plane, so they draw by
 * `order` rather than depth: the back, the flap while it is open past
 * upright, the card, the pocket, and the flap while it is shut over them.
 */
function parts(pose: Pose, flap: number, rise: number): Part[] {
  const sheet = (name: string, outline: Flat[], z: number, order: number) =>
    plate({ name, box: [left, top, right, bottom], outline, lift: z, role: "pocket", order, pose });
  // The fold sits on the back while the flap is open and on the pocket while it is shut.
  const hinge = BACK_Z + PAPER + (SHUT_Z - BACK_Z - PAPER) * ((1 + Math.cos((flap * Math.PI) / 180)) / 2);
  const flapPose: Pose = { position: place(pose, [0, top, hinge]), rotation: multiply(pose.rotation, rotateX(flap)) };
  const cardTop = top + CARD_DOWN - rise;
  return [
    slab({ name: "back", box: [left, top, right, bottom], radii: [mm(1), mm(1)], thickness: PAPER, order: 0, pose: shift(pose, BACK_Z + PAPER) }),
    slab({
      name: "flap",
      box: [left, 0, right, FLAP],
      outline: FLAP_SHAPE,
      thickness: PAPER,
      order: flap > 90 ? 1 : 6,
      pose: flapPose,
    }),
    slab({
      name: "card",
      box: [-CARD_WIDTH / 2, 0, CARD_WIDTH / 2, CARD_HEIGHT],
      radii: [mm(1.5), mm(1.5)],
      thickness: PAPER,
      order: 2,
      pose: shift(pose, CARD_Z + PAPER, cardTop),
    }),
    sheet("pocket-left", SIDE_LEFT, POCKET_Z, 3),
    sheet("pocket-right", SIDE_RIGHT, POCKET_Z, 3),
    sheet("pocket-bottom", BOTTOM, POCKET_Z + mm(0.2), 4),
  ];
}

/** The envelope's pose moved `z` towards the eye and `y` down its plane. */
const shift = (pose: Pose, z: number, y = 0): Pose => ({ position: place(pose, [0, y, z]), rotation: pose.rotation });

/**
 * Upright, the envelope's back faces the eye: its z turns to the model's y
 * and its y, down the envelope, to the model's -z.
 */
const UPRIGHT: Pose = { position: [0, 0, 0], rotation: rotateX(-90) };

/** Seen from in front, a little above and a little to the left. */
export const EYE = { yaw: 12, pitch: -8 } as const;

/** The envelope as the eye sees it, `open` from 0 to 1: the parts drawn, the card's pose, the clip that hides what is still inside, and the shadow. */
export function seen(open = 0) {
  const eye = camera({ width: 100, height: 120, perspective: 300, anchorY: 80, ...EYE });
  const { flap, rise } = stages(open);
  const scene = parts(UPRIGHT, flap, rise);
  // The shadow is the envelope's own, not the flap's while it stands out towards the eye.
  const body = scene.filter((part) => part.name !== "flap");
  const ground = (spread: number, ahead: number) => footprint(body, eye, { gap: mm(14), spread, ahead });
  const [contact, far] = [ground(mm(2), 0), ground(mm(10), mm(6))];
  const placed = poses(scene);
  const pose = (name: string) => {
    const found = placed.get(name);
    if (!found) throw new Error(`The envelope has no ${name}`);
    return found;
  };
  return {
    camera: eye,
    scene,
    drawn: draw(scene, eye),
    flap,
    rise,
    card: pose("card"),
    back: pose("back"),
    clip: shown(rise),
    shadow: contact.facing ? { contact: contact.d, ground: far.d } : null,
  };
}

export type View = ReturnType<typeof seen>;
