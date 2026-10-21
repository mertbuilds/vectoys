import type { Drawn, Silhouette } from "@vectoys/engine";
import type { SVGProps } from "react";

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
};

/**
 * Faces as `draw` sorted them. Each part first fills its hull in its base
 * look, so the hairline gaps antialiasing leaves between side quads show the
 * part's own colour and never the page behind. The base look is the side's,
 * or for a part without sides drawn, its first face's. A run of faces in one
 * look draws as one path: a round edge's many quads are then a single
 * element, and no seams show between them.
 */
/** Faces in a row that share a role, joined into one path's data. */
function runs(faces: readonly Drawn[]) {
  return faces.reduce<{ role: string; d: string }[]>((joined, face) => {
    const last = joined[joined.length - 1];
    if (last?.role === face.role) last.d += face.d;
    else joined.push({ role: face.role, d: face.d });
    return joined;
  }, []);
}

export function Faces({ faces, hulls, styles }: FacesProps) {
  const look = (part: string, role: string) => styles[`${part}.${role}`] ?? styles[role];
  return (
    <>
      {hulls.map((hull) => {
        const own = faces.filter((face) => face.part === hull.part);
        const base = own.some((face) => face.role === "side") ? "side" : own[0]?.role;
        return (
          <g key={hull.part}>
            {base !== undefined && <path d={hull.d} {...look(hull.part, base)} />}
            {runs(own).map((run, index) => (
              <path key={index} d={run.d} {...look(hull.part, run.role)} />
            ))}
          </g>
        );
      })}
    </>
  );
}
