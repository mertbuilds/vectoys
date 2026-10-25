import { settled, spring, type Spring, type SpringOptions } from "@vinena/vectoys";
import { useEffect, useRef, useState } from "react";
import { useFrames, useReducedMotion } from "./motion.ts";

/**
 * A number that springs to `target` whenever it changes, one frame at a
 * time, for a joint or a travel to follow. The server and the first render
 * give `target` itself, and so does every change while the page asks for
 * reduced motion, so the state still changes, only without the motion.
 */
export function useSpring(target: number, { stiffness, damping }: SpringOptions = {}): number {
  const reduced = useReducedMotion();
  const frames = useFrames();
  const [value, setValue] = useState(target);
  const state = useRef<Spring>({ value: target, velocity: 0 });

  useEffect(() => {
    const options = { ...(stiffness !== undefined && { stiffness }), ...(damping !== undefined && { damping }) };
    const rest = () => {
      state.current = { value: target, velocity: 0 };
      setValue(target);
    };
    if (reduced) {
      // A run already in flight ends on its next frame.
      frames(() => false);
      return rest();
    }
    frames((elapsed) => {
      state.current = spring(state.current, target, elapsed / 1000, options);
      if (settled(state.current, target)) {
        rest();
        return false;
      }
      setValue(state.current.value);
      return true;
    });
  }, [target, stiffness, damping, reduced, frames]);

  return value;
}
