/** A value on a spring and how fast it moves, in units a second. */
export type Spring = { readonly value: number; readonly velocity: number };

/** How stiff the spring is and how much it holds back; the defaults overshoot a little and settle in about half a second. */
export type SpringOptions = { readonly stiffness?: number; readonly damping?: number };

// Small fixed steps keep a stiff spring steady however long a frame took.
const STEP_MS = 4;

/** A spring `ms` milliseconds on, pulled towards `target`. */
export function spring({ value, velocity }: Spring, target: number, ms: number, { stiffness = 170, damping = 20 }: SpringOptions = {}): Spring {
  let [x, v] = [value, velocity];
  for (let left = ms; left > 0; left -= STEP_MS) {
    const dt = Math.min(left, STEP_MS) / 1000;
    v += (stiffness * (target - x) - damping * v) * dt;
    x += v * dt;
  }
  return { value: x, velocity: v };
}

/** Whether a spring has come to rest at `target`, within `tolerance`. */
export const settled = ({ value, velocity }: Spring, target: number, tolerance = 0.01) =>
  Math.abs(target - value) < tolerance && Math.abs(velocity) < tolerance * 10;
