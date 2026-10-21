import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

/** Whether a media query matches, kept up to date. */
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

export const useReducedMotion = () => useMedia("(prefers-reduced-motion: reduce)");

/** True from the first time the element is well inside the viewport, and from then on. */
export function useSeen(ref: RefObject<Element | null>, share = 0.5): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || seen) return;
    const watch = new IntersectionObserver(([entry]) => entry?.isIntersecting && setSeen(true), { threshold: share });
    watch.observe(element);
    return () => watch.disconnect();
  }, [ref, share, seen]);
  return seen;
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
