import type { Drawn, Silhouette } from "@vinena/vectoys";
import type { CSSProperties, SVGProps } from "react";

/** How a path of one role is painted: any SVG path attributes but its data. */
export type Look = Omit<SVGProps<SVGPathElement>, "d" | "ref">;

type FacesProps = {
  /** What `draw` returned. */
  faces: readonly Drawn[];
  hulls: readonly Silhouette[];
  /**
   * Each role's look, such as `top`, `side` or a plate's role. A key
   * `part.role` gives one part a look of its own, as a camera bump's top
   * needs when it shares the role `top` with the body it sits on.
   */
  styles: Readonly<Record<string, Look>>;
  /**
   * Darken each face's fill by how little light falls on it, as `draw`'s
   * `shade` tells, and lift the few faces turned right at the light, so
   * round edges read round. Only looks whose fill is a color are shaded,
   * not `none` or a `url(...)` paint.
   * The page tunes it with `--vectoys-shade-strength` (0.5 by default, 0 for
   * none), `--vectoys-shade-color` (black), `--vectoys-highlight-strength`
   * (0.25) and `--vectoys-highlight` (white).
   */
  shading?: boolean;
};

// Shades are cut to a few steps, so faces in about the same light still join
// into one path, and a round edge falls off in visible but gentle bands.
// Faces seen straight on stay at step 0, their own color; the few nearly
// facing the light take step -1, the highlight, which on a dark finish is
// what shows the edges round at all.
const STEPS = 8;
const HIGHLIGHT = 0.95;
const level = (shade: number) => (shade > HIGHLIGHT ? -1 : Math.floor((1 - shade) * STEPS));

/** The color a step mixes in, and how much of it. */
const mix = (step: number) =>
  step < 0
    ? "var(--vectoys-highlight, white) calc(var(--vectoys-highlight-strength, 0.25) * 100%)"
    : `var(--vectoys-shade-color, black) calc(var(--vectoys-shade-strength, 0.5) * ${(step / STEPS) * 100}%)`;

// Each step's mix is set once on a group round the faces, so every shaded
// path names it in a few bytes.
const name = (step: number) => `--vectoys-step${step}`;
const SHADED = [-1, ...Array.from({ length: STEPS }, (_, index) => index + 1)];
const MIXES = Object.fromEntries(SHADED.map((step) => [name(step), mix(step)])) as CSSProperties;

/** Whether a fill is a color `color-mix` can take, and not `none` or a paint server. */
const mixable = (fill: unknown): fill is string => typeof fill === "string" && fill !== "none" && !fill.startsWith("url(");

/** A look's fill mixed by its shade step, or the look as it is when its fill is not a color. */
function shaded(look: Look | undefined, step: number): Look | undefined {
  const fill = look?.style?.fill ?? look?.fill;
  if (!look || step === 0 || !mixable(fill)) return look;
  return { ...look, style: { ...look.style, fill: `color-mix(in srgb, ${fill}, var(${name(step)}))` } };
}

type Run = { role: string; step: number; d: string };

/** Faces in a row that share a role, joined into one path's data. */
function runs(faces: readonly Drawn[]) {
  return faces.reduce<Run[]>((joined, face) => {
    const last = joined[joined.length - 1];
    if (last?.role === face.role) last.d += face.d;
    else joined.push({ role: face.role, step: 0, d: face.d });
    return joined;
  }, []);
}

/**
 * One part's faces that share a role and a shade step, joined into one
 * path's data wherever they stand in the drawing order. That is safe within
 * a part: its faces that face the eye never cover each other.
 */
function groups(faces: readonly Drawn[]) {
  const joined = new Map<string, Run>();
  for (const face of faces) {
    const step = level(face.shade);
    const key = `${face.role} ${step}`;
    const group = joined.get(key);
    if (group) group.d += face.d;
    else joined.set(key, { role: face.role, step, d: face.d });
  }
  return [...joined.values()];
}

/** The shade step of a part's base: its sides' mean, so the hairline gaps between shaded faces show a tone close to theirs. */
function baseStep(faces: readonly Drawn[], role: string) {
  const own = faces.filter((face) => face.role === role);
  return level(own.reduce((sum, face) => sum + face.shade, 0) / own.length);
}

/**
 * Faces as `draw` sorted them. Each part first fills its hull in its base
 * look, so the hairline gaps antialiasing leaves between side quads show the
 * part's own color and never the page behind. The base look is the side's,
 * or for a part without sides drawn, its first face's. A run of faces in one
 * look draws as one path: a round edge's many quads are then a single
 * element, and no seams show between them. Shaded, a part's faces join by
 * role and shade step instead, so the path count stays near the unshaded one.
 */
export function Faces({ faces, hulls, styles, shading = false }: FacesProps) {
  const look = (part: string, role: string) => styles[`${part}.${role}`] ?? styles[role];
  const drawn = hulls.map((hull) => {
    const own = faces.filter((face) => face.part === hull.part);
    const base = own.some((face) => face.role === "side") ? "side" : own[0]?.role;
    if (base === undefined) return <g key={hull.part} />;
    return (
      <g key={hull.part}>
        <path d={hull.d} {...(shading ? shaded(look(hull.part, base), baseStep(own, base)) : look(hull.part, base))} />
        {(shading ? groups(own) : runs(own)).map((run, index) => (
          <path key={index} d={run.d} {...shaded(look(hull.part, run.role), run.step)} />
        ))}
      </g>
    );
  });
  return shading ? <g style={MIXES}>{drawn}</g> : <>{drawn}</>;
}
