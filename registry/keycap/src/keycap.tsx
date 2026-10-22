import { fixed } from "@vectoys/engine";
import { Faces, Screen, Stage, useSpring, type Look } from "@vectoys/react";
import {
  memo,
  useId,
  useMemo,
  useState,
  type ComponentProps,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { HOVER, LABEL, LABEL_ROUND, TRAVEL, seen, type View } from "./geometry";

// The page's colours, as CSS variables, each with a light tone so the key
// shows as meant before they are set. The cap is in the finish, the label in
// the ink.
const HAIRLINE = "var(--vectoys-hairline, #8a8a8a)";
const SURFACE = "var(--vectoys-surface, #f5f5f5)";
const SHADOW = "var(--vectoys-shadow, rgba(0, 0, 0, 0.08))";
const FINISH = `var(--vectoys-finish, ${SURFACE})`;
const INK = "var(--vectoys-ink, #1d1d1c)";

// The cap's sides a step under its top and the dish a touch deeper, a dark
// switch housing, on a deck a step under the surface.
const CAP_SIDE = `color-mix(in srgb, ${FINISH} 86%, ${HAIRLINE})`;
const DISH = `color-mix(in srgb, ${FINISH} 96%, ${HAIRLINE})`;
const HOUSING = `color-mix(in srgb, ${HAIRLINE} 30%, #1a1a1a)`;
const DECK = `color-mix(in srgb, ${SURFACE} 80%, ${HAIRLINE})`;

const fill = (color: string): Look => ({ style: { fill: color } });
const STYLES: Record<string, Look> = {
  side: fill(DECK),
  top: fill(DECK),
  bottom: fill(DECK),
  "housing.side": fill(HOUSING),
  "housing.top": fill(HOUSING),
  "cap.side": fill(CAP_SIDE),
  "cap.top": fill(FINISH),
  dish: fill(DISH),
};

const OUTLINE: Look = {
  vectorEffect: "non-scaling-stroke",
  strokeWidth: 1,
  strokeLinejoin: "round",
  style: { stroke: HAIRLINE, fill: "none" },
};

/** CSS pixels the label lays out across the cap's top. */
export const LABEL_WIDTH = 120;

const BUTTON: CSSProperties = {
  appearance: "none",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  margin: 0,
  padding: "12%",
  border: 0,
  borderRadius: `${fixed((LABEL_ROUND / LABEL.width) * 100)}%`,
  background: "transparent",
  color: INK,
  font: "inherit",
  fontSize: 28,
  fontWeight: 500,
  lineHeight: 1.1,
  textAlign: "center",
  cursor: "pointer",
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

/** The soft shadow under the key, under names of its own so any number of keys share a page. */
const Shadow = ({ id, shadow }: { id: string; shadow: View["shadow"] }) => (
  <>
    <defs>
      <filter id={`${id}-near`} filterUnits="userSpaceOnUse" x="-50" y="-50" width="200" height="200">
        <feGaussianBlur stdDeviation="0.8 0.5" />
      </filter>
      <filter id={`${id}-far`} filterUnits="userSpaceOnUse" x="-50" y="-50" width="200" height="200">
        <feGaussianBlur stdDeviation="3 1.8" />
      </filter>
    </defs>
    <path d={shadow.ground} filter={`url(#${id}-far)`} style={{ fill: SHADOW }} />
    <path d={shadow.contact} filter={`url(#${id}-near)`} style={{ fill: SHADOW }} />
  </>
);

const PRESS_KEYS = new Set([" ", "Enter"]);

/** The button's own events the cap follows; a caller's handlers for them still run, first. */
type PressHandlers = Pick<
  ComponentProps<"button">,
  "onPointerEnter" | "onPointerLeave" | "onPointerDown" | "onPointerUp" | "onPointerCancel" | "onKeyDown" | "onKeyUp" | "onBlur"
>;

/** Whether the cap is under the pointer and whether it is held down, from the button's own events. */
function usePress(disabled: boolean, caller: PressHandlers) {
  const [hover, setHover] = useState(false);
  const [held, setHeld] = useState(false);
  const handlers: PressHandlers = {
    onPointerEnter: (event) => {
      caller.onPointerEnter?.(event);
      setHover(true);
    },
    onPointerLeave: (event) => {
      caller.onPointerLeave?.(event);
      setHover(false);
      setHeld(false);
    },
    onPointerDown: (event) => {
      caller.onPointerDown?.(event);
      if (event.button === 0) setHeld(true);
    },
    onPointerUp: (event) => {
      caller.onPointerUp?.(event);
      setHeld(false);
    },
    onPointerCancel: (event) => {
      caller.onPointerCancel?.(event);
      setHeld(false);
    },
    onKeyDown: (event) => {
      caller.onKeyDown?.(event);
      if (PRESS_KEYS.has(event.key)) setHeld(true);
    },
    onKeyUp: (event) => {
      caller.onKeyUp?.(event);
      if (PRESS_KEYS.has(event.key)) setHeld(false);
    },
    onBlur: (event) => {
      caller.onBlur?.(event);
      setHeld(false);
    },
  };
  return { hover: hover && !disabled, held: held && !disabled, handlers };
}

export type KeycapProps = Omit<ComponentProps<"button">, "children"> & {
  /** The label on the cap's top, live HTML laid out about `LABEL_WIDTH` pixels across; it names the button too. */
  children?: ReactNode;
  /** Called when the key is pressed, by pointer, touch or keyboard. */
  onPress?: () => void;
  /** The cap's colour; by default the page's `--vectoys-finish`, else its surface. */
  finish?: string;
};

/**
 * A big mechanical key that is a real button, for a call to action. The
 * label is live HTML on the cap's top, and the button is that top, so it
 * takes focus, Enter and Space as any button does. The cap lifts under the
 * pointer and travels down while held, then springs back; under reduced
 * motion it moves straight between those places.
 */
export const Keycap = memo(function Keycap({ children, onPress, finish, onClick, style, disabled = false, ...button }: KeycapProps) {
  const id = `keycap-${useId().replace(/[^\w-]/g, "")}`;
  const { hover, held, handlers } = usePress(disabled, button);
  // The cap bottoms out on the switch, so the spring's overshoot never shows past it.
  const travel = Math.min(useSpring(held ? TRAVEL : hover ? -HOVER : 0), TRAVEL);
  const view = useMemo(() => seen(travel), [travel]);
  const cap = view.drawn.hulls.find((hull) => hull.part === "cap")!;

  const press = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    onPress?.();
  };

  const label = (
    <Screen camera={view.camera} pose={view.top} rect={LABEL} width={LABEL_WIDTH}>
      <button
        type="button"
        {...button}
        {...handlers}
        disabled={disabled}
        data-pressed={held || undefined}
        onClick={press}
        style={{ ...BUTTON, ...(disabled && { cursor: "default", opacity: 0.6 }), ...style }}
      >
        {children}
      </button>
    </Screen>
  );

  return (
    <Stage camera={view.camera} overlay={label} style={finish ? ({ "--vectoys-finish": finish } as CSSProperties) : {}}>
      <Shadow id={id} shadow={view.shadow} />
      <Faces faces={view.drawn.faces} hulls={view.drawn.hulls} styles={STYLES} shading />
      <path d={cap.d} {...OUTLINE} />
    </Stage>
  );
});

export type KeycapRowProps = {
  /** One key for each label, left to right, such as the letters of a word. */
  keys: readonly string[];
  /** Called with the key's label and place when one is pressed. */
  onPress?: (key: string, index: number) => void;
  /** Names the row for assistive technology, such as the word the keys spell. */
  label?: string;
  finish?: string;
  className?: string;
  style?: CSSProperties;
};

/** A row of keys side by side, such as a word spelled out, each its own button. */
export function KeycapRow({ keys, onPress, label, finish, className, style }: KeycapRowProps) {
  return (
    <div role="group" aria-label={label} className={className} style={{ display: "flex", ...style }}>
      {keys.map((key, index) => (
        <div key={index} style={{ flex: "1 1 0", minWidth: 0, marginInline: "-4%" }}>
          <Keycap {...(finish && { finish })} {...(onPress && { onPress: () => onPress(key, index) })} style={{ fontSize: 48 }}>
            {key}
          </Keycap>
        </div>
      ))}
    </div>
  );
}
