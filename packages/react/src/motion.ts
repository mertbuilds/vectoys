import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

const REDUCED = "(prefers-reduced-motion: reduce)";
// Without a window, as on the server or in a test, nothing asks for less motion.
const canMatch = () => typeof matchMedia === "function";

function subscribe(changed: () => void) {
  if (!canMatch()) return () => {};
  const list = matchMedia(REDUCED);
  list.addEventListener("change", changed);
  return () => list.removeEventListener("change", changed);
}

const reducedNow = () => canMatch() && matchMedia(REDUCED).matches;
const reducedOnServer = () => false;

/** Whether the page asks for less motion, kept up to date; false on the server. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, reducedNow, reducedOnServer);
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
