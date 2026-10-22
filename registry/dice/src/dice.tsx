import { fixed, type Rotation } from "@vectoys/engine";
import { Faces, Stage, useFrames, useReducedMotion, type Look } from "@vectoys/react";
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { VALUES, resting, roll, rollAt, seen, type Value, type View } from "./geometry";

// The page's colours, as CSS variables, each with a light tone so the die
// shows as meant before they are set: a die in the finish, else the surface,
// with pips in the ink.
const HAIRLINE = "var(--vectoys-hairline, #8a8a8a)";
const SURFACE = "var(--vectoys-surface, #f5f5f5)";
const SHADOW = "var(--vectoys-shadow, rgba(0, 0, 0, 0.08))";
const FINISH = `var(--vectoys-finish, ${SURFACE})`;
const INK = "var(--vectoys-ink, #1d1d1c)";
const FOCUS = "var(--vectoys-focus, currentColor)";
const FOCUS_WIDTH = "var(--vectoys-focus-width, 1px)";

const fill = (color: string): Look => ({ style: { fill: color } });
const STYLES: Record<string, Look> = {
  top: fill(FINISH),
  bottom: fill(FINISH),
  side: fill(FINISH),
  pip: fill(INK),
};

const OUTLINE: Look = {
  vectorEffect: "non-scaling-stroke",
  strokeWidth: 1,
  strokeLinejoin: "round",
  style: { stroke: `color-mix(in srgb, ${HAIRLINE} 60%, transparent)`, fill: "none" },
};

// The die at rest, and the box round it in the stage, as shares, for the
// button over it: a little wider than the die and up to where it hops.
const REST = seen();
const BOUNDS = (() => {
  const points = REST.drawn.hulls.flatMap((hull) => hull.points);
  const [xs, ys] = [points.map(([x]) => x), points.map(([, y]) => y)];
  const { width, height } = REST.camera;
  const [left, right] = [Math.min(...xs) - 4, Math.max(...xs) + 4];
  const [top, bottom] = [Math.min(...ys) - 12, Math.max(...ys) + 6];
  return { left: left / width, top: top / height, width: (right - left) / width, height: (bottom - top) / height };
})();

const percent = (share: number) => `${fixed(share * 100)}%`;
const BUTTON = "vectoys-dice-button";
const BUTTON_STYLE: CSSProperties = {
  position: "absolute",
  left: percent(BOUNDS.left),
  top: percent(BOUNDS.top),
  width: percent(BOUNDS.width),
  height: percent(BOUNDS.height),
  margin: 0,
  padding: 0,
  border: 0,
  borderRadius: "16%",
  background: "transparent",
  cursor: "pointer",
  appearance: "none",
};
const FOCUS_RING = `.${BUTTON}{outline:none}.${BUTTON}:focus-visible{outline:${FOCUS_WIDTH} solid ${FOCUS};outline-offset:2px}`;
// Read out, never seen.
const HIDDEN: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
};

/** The soft shadow under the die, fainter the higher it hops, under names of its own so any number of dice share a page. */
const Shadow = ({ id, shadow }: { id: string; shadow: View["shadow"] }) => (
  <g opacity={fixed(shadow.strength)}>
    <defs>
      <filter id={`${id}-near`} filterUnits="userSpaceOnUse" x="-50" y="-50" width="200" height="200">
        <feGaussianBlur stdDeviation="0.5 0.35" />
      </filter>
      <filter id={`${id}-far`} filterUnits="userSpaceOnUse" x="-50" y="-50" width="200" height="200">
        <feGaussianBlur stdDeviation="2 1.2" />
      </filter>
    </defs>
    <path d={shadow.ground} filter={`url(#${id}-far)`} style={{ fill: SHADOW }} />
    <path d={shadow.contact} filter={`url(#${id}-near)`} style={{ fill: SHADOW }} />
  </g>
);

type DiceProps = {
  /** The face every roll lands on, and a new value rolls to it; random when left out. */
  value?: Value;
  /** Called with the face on top once a roll has landed. */
  onRoll?: (value: Value) => void;
  /** The die's colour; by default the page's `--vectoys-finish`, else its surface. */
  finish?: string;
  /** The button's name for assistive technology. */
  label?: string;
  className?: string;
  style?: CSSProperties;
};

const random = (): Value => VALUES[Math.floor(Math.random() * VALUES.length)] ?? 1;

/**
 * A die that rolls when clicked, tapped or pressed: it hops, tumbles a few
 * turns, lands on a random or given face, rocks and settles, its shadow
 * following on the ground. The face on top is read out as it lands.
 */
export function Dice({ value, onRoll, finish, label = "Roll the die", className, style }: DiceProps) {
  const id = `dice-${useId().replace(/[^\w-]/g, "")}`;
  const reduced = useReducedMotion();
  const frames = useFrames();
  const [state, setState] = useState<{ rotation: Rotation; hop: number }>(() => ({ rotation: resting(value ?? 5), hop: 0 }));
  const current = useRef(state);
  const [shown, setShown] = useState<Value>(value ?? 5);
  // The face the die is on or rolling to, and whether it is in the air.
  const target = useRef<Value>(shown);
  const rolling = useRef(false);

  const set = (next: { rotation: Rotation; hop: number }) => {
    current.current = next;
    setState(next);
  };

  const start = (next: Value) => {
    target.current = next;
    const land = () => {
      rolling.current = false;
      setShown(next);
      onRoll?.(next);
    };
    if (reduced) {
      set({ rotation: resting(next), hop: 0 });
      return land();
    }
    rolling.current = true;
    const path = roll(current.current.rotation, next, Math.random() * 360);
    let ms = 0;
    frames((elapsed) => {
      ms += elapsed;
      const at = rollAt(path, ms);
      set({ rotation: at.rotation, hop: at.hop });
      if (at.done) land();
      return !at.done;
    });
  };

  useEffect(() => {
    if (value !== undefined && value !== target.current) start(value);
  }, [value]);

  const click = () => {
    if (!rolling.current) start(value ?? random());
  };

  const view = useMemo(() => seen(state.rotation, state.hop), [state]);
  const die = view.drawn.hulls.find((hull) => hull.part === "die");

  const overlay = (
    <>
      <style>{FOCUS_RING}</style>
      <button type="button" className={BUTTON} aria-label={label} style={BUTTON_STYLE} onClick={click} />
      <span aria-live="polite" style={HIDDEN}>{`Showing ${shown}`}</span>
    </>
  );

  return (
    <div className={className} style={{ position: "relative", touchAction: "manipulation", ...style }}>
      <Stage camera={view.camera} overlay={overlay} style={finish ? { "--vectoys-finish": finish } : {}}>
        <Shadow id={id} shadow={view.shadow} />
        <Faces faces={view.drawn.faces} hulls={view.drawn.hulls} styles={STYLES} shading />
        {die && <path d={die.d} {...OUTLINE} />}
      </Stage>
    </div>
  );
}
