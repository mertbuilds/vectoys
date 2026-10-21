import { settled, spring, type Spring, type SpringOptions } from "@vectoys/engine";
import { useEffect, useRef, useState } from "react";

const REDUCED = "(prefers-reduced-motion: reduce)";
const reduced = () => typeof matchMedia === "function" && matchMedia(REDUCED).matches;

// A frame that comes late, as after a hidden tab, moves at most this far, so
// the value never jumps.
const LONGEST_FRAME = 1 / 30;

/**
 * A number that springs to `target` whenever it changes, one frame at a
 * time, for a joint or a travel to follow. The server and the first render
 * give `target` itself, and so does every change while the page asks for
 * reduced motion, so the state still changes, only without the motion.
 */
export function useSpring(target: number, { stiffness, damping }: SpringOptions = {}): number {
  const [value, setValue] = useState(target);
  const state = useRef<Spring>({ value: target, velocity: 0 });

  useEffect(() => {
    const options = { ...(stiffness !== undefined && { stiffness }), ...(damping !== undefined && { damping }) };
    const rest = () => {
      state.current = { value: target, velocity: 0 };
      setValue(target);
    };
    if (reduced()) return rest();
    let frame = 0;
    let last: number | undefined;
    const tick = (now: number) => {
      const seconds = last === undefined ? 0 : Math.min((now - last) / 1000, LONGEST_FRAME);
      last = now;
      state.current = spring(state.current, target, seconds, options);
      if (settled(state.current, target)) return rest();
      setValue(state.current.value);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, stiffness, damping]);

  return value;
}
