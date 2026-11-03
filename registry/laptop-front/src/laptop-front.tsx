import { Laptop } from "@vectoys/laptop";
import type { StyleWithVariables, TurnOptions } from "@vinena/vectoys-react";
import { memo, type ReactNode } from "react";

/** The two finishes the aluminum comes in: silver as it is, space black as silver taken down to #3d3b3e. */
const FINISHES = { silver: undefined, black: "brightness(0.255)" } as const;

// Straight on at rest, the laptop turns as far as the laptop toy does, 35
// degrees each way, and from level to looking down on it at 30.
const LIMITS = { yaw: [-35, 35], pitch: [-30, 0] } as const;
// As large, and as high up, as keeps the whole laptop inside its stage in
// every pose those limits reach, so a turn never crops it.
const FIT = { scale: 0.685, y: 0.04 } as const;

type LaptopFrontProps = {
  /** The aluminum's color; silver by default. */
  finish?: keyof typeof FINISHES;
  /** The laptop's name for assistive technology. */
  label?: string;
  /** Live content on the display, laid out as on a screen about 1280 pixels wide. */
  children?: ReactNode;
} & TurnOptions;

/**
 * A 14 inch laptop straight on, the realistic laptop at FRONT's look, with
 * live content on its display under the notch. A drag on it, the display
 * too, turns the laptop round in 3D, and a button shows it full screen; the
 * links, buttons and fields on the display are used as on a real screen.
 */
export const LaptopFront = memo(function LaptopFront({ finish, children, label = "Laptop", limits, ...turning }: LaptopFrontProps) {
  const tint = finish && FINISHES[finish];
  const style: StyleWithVariables | undefined = tint ? { "--vectoys-tint": tint } : undefined;
  // At flat 1 and every angle 0 the free laptop is FRONT's shot, here a little smaller; a drag turns it from there.
  return (
    <div style={style}>
      <Laptop look="realistic" free flat={1} {...FIT} label={label} limits={{ ...LIMITS, ...limits }} {...turning}>
        {children}
      </Laptop>
    </div>
  );
});
