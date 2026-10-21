/** A value on its way somewhere: where it is and how fast it moves, per second. */
export type Spring = { readonly value: number; readonly velocity: number };

/**
 * How a spring pulls: `stiffness` towards the target and `damping` against
 * its speed, for a mass of 1. Under critical damping (2 times the root of the
 * stiffness) it overshoots a little and settles, as a key springs back.
 */
export type SpringOptions = { readonly stiffness?: number; readonly damping?: number };

export const STIFFNESS = 600;
export const DAMPING = 32;

// Small steps keep a stiff spring stable at any frame rate.
const STEP = 1 / 240;

/** Where a spring is `seconds` later, pulled towards `target`. */
export function spring({ value, velocity }: Spring, target: number, seconds: number, options: SpringOptions = {}): Spring {
  const { stiffness = STIFFNESS, damping = DAMPING } = options;
  let left = Math.max(0, seconds);
  while (left > 0) {
    const dt = Math.min(STEP, left);
    velocity += (stiffness * (target - value) - damping * velocity) * dt;
    value += velocity * dt;
    left -= dt;
  }
  return { value, velocity };
}

/** Whether a spring has as good as stopped at `target`, both within `tolerance`. */
export const settled = ({ value, velocity }: Spring, target: number, tolerance = 1e-3) =>
  Math.abs(value - target) < tolerance && Math.abs(velocity) < tolerance;
