import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

/** Whether a media query matches, kept up to date. False on the server and through hydration. */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (changed) => {
      const list = matchMedia(query);
      list.addEventListener("change", changed);
      return () => list.removeEventListener("change", changed);
    },
    () => matchMedia(query).matches,
    () => false,
  );
}

export { useReducedMotion } from "@vinena/vectoys-react";

/**
 * True from the first time the element's middle comes up past `line` of the
 * viewport's height, or the whole element is in view, and from then on: so an
 * animation starts when someone looks at it, not while they read above it.
 */
export function useInFocus(ref: RefObject<Element | null>, line = 0.6): boolean {
  const [inFocus, setInFocus] = useState(false);
  useEffect(() => {
    if (inFocus) return;
    let frame = 0;
    const check = () => {
      frame = 0;
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      const whole = box.top >= 0 && box.bottom <= innerHeight;
      if (whole || (box.bottom > 0 && box.top + box.height / 2 <= innerHeight * line)) setInFocus(true);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
    };
  }, [ref, line, inFocus]);
  return inFocus;
}

export const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Eases a number from one value to another, frame by frame. Returns a function that stops it. */
export function tween(from: number, to: number, ms: number, frame: (value: number) => void, done?: () => void) {
  const start = performance.now();
  let id = requestAnimationFrame(function step(now) {
    const t = clamp((now - start) / ms, 0, 1);
    frame(from + (to - from) * easeInOut(t));
    if (t < 1) id = requestAnimationFrame(step);
    else done?.();
  });
  return () => cancelAnimationFrame(id);
}
