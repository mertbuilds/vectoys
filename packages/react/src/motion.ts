import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

const REDUCED = "(prefers-reduced-motion: reduce)";

/** Whether the page asks for less motion, kept up to date; false on the server. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (changed) => {
      const list = matchMedia(REDUCED);
      list.addEventListener("change", changed);
      return () => list.removeEventListener("change", changed);
    },
    () => matchMedia(REDUCED).matches,
    () => false,
  );
}

// A frame longer than this, as after a hidden tab comes back, counts as this
// long, so nothing jumps.
const LONGEST_FRAME = 64;

/**
 * Starts a loop that calls `step` every frame with the milliseconds since
 * the last, until `step` returns false, another loop starts or the component
 * goes away.
 */
export function useFrames() {
  const stop = useRef(() => {});
  useEffect(() => () => stop.current(), []);
  return useCallback((step: (elapsed: number) => boolean) => {
    stop.current();
    let last = performance.now();
    let id = requestAnimationFrame(function frame(now) {
      const elapsed = Math.min(now - last, LONGEST_FRAME);
      last = now;
      if (step(elapsed)) id = requestAnimationFrame(frame);
    });
    stop.current = () => cancelAnimationFrame(id);
  }, []);
}
