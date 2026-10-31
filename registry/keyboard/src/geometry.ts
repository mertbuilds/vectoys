import { IDENTITY, camera, draw, fixed, footprint, slab, type Part, type Solid } from "@vinena/vectoys";

// A full-size keyboard with a US layout: low, flat caps with small round
// corners on a thin case. Sizes are in key units, 1 being the 19.05 mm pitch
// of one letter key, at U scene units each.
const U = 5.8;
const u = (value: number) => value * U;

/** The rows of keys are this many key units across. */
export const FIELD_WIDTH = 14.5;
const ROW = 0.62;
const FIELD_DEPTH = ROW + 5;
const GAP = 0.16;
const CAP_HEIGHT = 0.16;
const CAP_TAPER = 0.03;
const CAP_ROUND = 0.1;
const MARGIN = 0.36;
const CASE_THICKNESS = 0.3;
const CASE_ROUND = 0.42;
// Points round a corner every half scene unit, coarse enough to redraw every frame.
const STEP = 0.5;

/** How far a cap travels down when pressed, in key units. */
export const TRAVEL = 0.1;

/** Where a legend sits on the cap's top: in the middle, one of two stacked lines, or in a corner. */
type At = "c" | "t" | "b" | "tl" | "tr" | "bl" | "br";

/** A legend on a cap, in hundredths of a key unit from the middle of its top. */
export type Legend = { text: string; x: number; y: number; size: number; anchor: "start" | "middle" | "end" };

export type Key = {
  /** The `KeyboardEvent.code` the key answers to, or a name of its own for a key that sends none. */
  id: string;
  /** Its place and size in key units, from the back left of the rows. */
  x: number;
  y: number;
  width: number;
  height: number;
  legends: Legend[];
  /** Where the caps lock light sits on its top, on the one key that has it. */
  light?: { x: number; y: number };
};

type Spec = [id: string, width: number, ...legends: [At, string, number][]];

const LETTER = 30;
const PAIR = 22;
const WORD = 15;
const SMALL = 13;

const letters = (row: string) => [...row].map((letter): Spec => [`Key${letter}`, 1, ["c", letter, LETTER]]);
const pair = (id: string, top: string, bottom: string): Spec => [id, 1, ["t", top, PAIR], ["b", bottom, PAIR]];
const digits = [..."!@#$%^&*()"].map((shifted, index): Spec => pair(`Digit${(index + 1) % 10}`, shifted, `${(index + 1) % 10}`));
const fn = Array.from({ length: 12 }, (_, index): Spec => [`F${index + 1}`, 1, ["c", `F${index + 1}`, SMALL]]);
const mod = (id: string, width: number, symbol: string, word: string, left: boolean): Spec => [
  id,
  width,
  [left ? "tr" : "tl", symbol, WORD + 2],
  [left ? "br" : "bl", word, WORD],
];

/** The rows back to front, each 14.5 key units across, as on a compact full-size board. */
const ROWS: Spec[][] = [
  [["Escape", 1.5, ["bl", "esc", WORD]], ...fn, ["Lock", 1]],
  [pair("Backquote", "~", "`"), ...digits, pair("Minus", "_", "-"), pair("Equal", "+", "="), ["Backspace", 1.5, ["br", "delete", WORD]]],
  [["Tab", 1.5, ["bl", "tab", WORD]], ...letters("QWERTYUIOP"), pair("BracketLeft", "{", "["), pair("BracketRight", "}", "]"), pair("Backslash", "|", "\\")],
  [["CapsLock", 1.75, ["bl", "caps lock", WORD]], ...letters("ASDFGHJKL"), pair("Semicolon", ":", ";"), pair("Quote", '"', "'"), ["Enter", 1.75, ["br", "return", WORD]]],
  [["ShiftLeft", 2.25, ["bl", "shift", WORD]], ...letters("ZXCVBNM"), pair("Comma", "<", ","), pair("Period", ">", "."), pair("Slash", "?", "/"), ["ShiftRight", 2.25, ["br", "shift", WORD]]],
  [
    ["Fn", 1, ["bl", "fn", WORD]],
    mod("ControlLeft", 1, "⌃", "control", true),
    mod("AltLeft", 1, "⌥", "option", true),
    mod("MetaLeft", 1.25, "⌘", "command", true),
    ["Space", 5],
    mod("MetaRight", 1.25, "⌘", "command", false),
    mod("AltRight", 1, "⌥", "option", false),
  ],
];

/** The arrows, an inverted T of half height keys at the front right. */
const ARROWS: [id: string, x: number, y: number, text: string][] = [
  ["ArrowLeft", 11.5, 0.5, "◀"],
  ["ArrowUp", 12.5, 0, "▲"],
  ["ArrowDown", 12.5, 0.5, "▼"],
  ["ArrowRight", 13.5, 0.5, "▶"],
];

/** How far from the middle of a cap's top its corner legends stand, across and back, in hundredths of a key unit. */
const inset = (width: number, height: number) => [(width * 100 - GAP * 100) / 2 - CAP_TAPER * 100 - 11, (height * 100 - GAP * 100) / 2 - CAP_TAPER * 100 - 9] as const;

/** A legend's place on a cap `width` by `height` key units. */
function legend([at, text, size]: [At, string, number], width: number, height: number): Legend {
  const [halfWidth, halfHeight] = inset(width, height);
  const x = at.endsWith("l") ? -halfWidth : at.endsWith("r") ? halfWidth : 0;
  const y = at === "c" ? size * 0.36 : at === "t" ? -size * 0.12 : at === "b" ? size * 0.98 : at.startsWith("t") ? -halfHeight + size * 0.72 : halfHeight;
  return { text, x: fixed(x), y: fixed(y), size, anchor: at.endsWith("l") ? "start" : at.endsWith("r") ? "end" : "middle" };
}

function layout(): Key[] {
  const keys = ROWS.flatMap((row, index) => {
    const y = index === 0 ? 0 : ROW + index - 1;
    const height = index === 0 ? ROW : 1;
    let x = 0;
    return row.map(([id, width, ...legends]): Key => {
      const [left, back] = inset(width, height);
      const key: Key = { id, x, y, width, height, legends: legends.map((spec) => legend(spec, width, height)) };
      if (id === "CapsLock") key.light = { x: fixed(-left), y: fixed(-back) };
      x += width;
      return key;
    });
  });
  const front = ROW + 4;
  const arrows = ARROWS.map(([id, x, y, text]): Key => ({ id, x, y: front + y, width: 1, height: 0.5, legends: [legend(["c", text, SMALL - 2], 1, 0.5)] }));
  return [...keys, ...arrows];
}

/** Every key, back row first. */
export const KEYS: readonly Key[] = layout();

/** Other codes some keyboards and browsers send, and the key each presses. */
const ALIASES: Readonly<Record<string, string>> = { OSLeft: "MetaLeft", OSRight: "MetaRight", ControlRight: "ControlLeft", NumpadEnter: "Enter" };
const IDS = new Set(KEYS.map((key) => key.id));

/** The key a `KeyboardEvent.code` presses, if the board has one. */
export const keyFor = (code: string): string | undefined => {
  const id = ALIASES[code] ?? code;
  return IDS.has(id) ? id : undefined;
};

/** Seen from in front and well above, square on, as a keyboard on a desk is. */
export const EYE = camera({ width: 100, height: 38, perspective: 320, pitch: -50, anchorY: 16, originY: 17 });

const at = (z: number) => ({ position: [0, 0, z] as const, rotation: IDENTITY });

/** The middle of a key's cap in the model, at its foot. */
const middle = (key: Key): [number, number] => [u(key.x + key.width / 2 - FIELD_WIDTH / 2), u(key.y + key.height / 2 - FIELD_DEPTH / 2)];

/** A key's cap, `travel` key units down: it sinks into the case, so its sides grow shorter. */
function cap(key: Key, travel: number): Part {
  const [x, y] = middle(key);
  const [half, deep] = [u(key.width - GAP) / 2, u(key.height - GAP) / 2];
  const height = u(CAP_HEIGHT - travel);
  return slab({
    name: key.id,
    box: [x - half, y - deep, x + half, y + deep],
    radii: [u(CAP_ROUND), u(CAP_ROUND)],
    thickness: height,
    taper: (u(CAP_TAPER) * height) / u(CAP_HEIGHT),
    step: STEP,
    pose: at(height),
  });
}

const CASE: Part = slab({
  name: "case",
  box: [-u(FIELD_WIDTH / 2 + MARGIN), -u(FIELD_DEPTH / 2 + MARGIN), u(FIELD_WIDTH / 2 + MARGIN), u(FIELD_DEPTH / 2 + MARGIN)],
  radii: [u(CASE_ROUND), u(CASE_ROUND)],
  thickness: u(CASE_THICKNESS),
  edge: u(0.08),
  step: STEP,
  pose: at(0),
});

const ground = (spread: number, ahead: number) => footprint([CASE], EYE, { spread, ahead }).d;

/** The case and its shadow, which never move, drawn once. */
export const BOARD = { drawn: draw([CASE], EYE), shadow: { contact: ground(u(0.05), 0), ground: ground(u(0.35), u(0.3)) } };

/** The keys from the farthest to the nearest, the order they draw in, so a near cap covers the sides of the one behind it. */
export const ORDER: readonly Key[] = (() => {
  const far = (key: Key) => {
    const [x, y] = middle(key);
    const [vx, vy, vz] = EYE.toView([x, y, u(CAP_HEIGHT)]);
    return (vx - EYE.originX) ** 2 + (vy - EYE.originY) ** 2 + (vz - EYE.perspective) ** 2;
  };
  return [...KEYS].sort((a, b) => far(b) - far(a));
})();

/**
 * The flat transform that lays a key's legends on its top, in hundredths of
 * a key unit from its middle. Across one cap the perspective barely changes,
 * so the slope at the middle is enough.
 */
function onTop(key: Key, height: number) {
  const [x, y] = middle(key);
  const point = (dx: number, dy: number): Solid => [x + dx, y + dy, height];
  const [ox, oy] = EYE.project(point(0, 0));
  const [ax, ay] = EYE.project(point(U, 0));
  const [bx, by] = EYE.project(point(0, U));
  const n = (value: number) => fixed(value / 100);
  return `matrix(${n(ax - ox)} ${n(ay - oy)} ${n(bx - ox)} ${n(by - oy)} ${fixed(ox)} ${fixed(oy)})`;
}

/** A key as the eye sees it `travel` key units down: its cap's faces and the transform of its legends. */
function view(key: Key, travel: number) {
  return { drawn: draw([cap(key, travel)], EYE), legends: onTop(key, u(CAP_HEIGHT - travel)) };
}

export type KeyView = ReturnType<typeof view>;

// Every key at rest and fully down, drawn once each; the frames between are drawn as they come.
const kept = new Map<string, KeyView>();

/** A key's cap and legends with it `travel` key units down. */
export function seen(key: Key, travel = 0): KeyView {
  if (travel !== 0 && travel !== TRAVEL) return view(key, travel);
  const name = `${key.id} ${travel}`;
  const found = kept.get(name) ?? view(key, travel);
  kept.set(name, found);
  return found;
}
