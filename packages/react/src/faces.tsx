import type { Drawn, Silhouette } from "@hinge/engine";
import type { SVGProps } from "react";

/** How a path of one role is painted: any SVG path attributes but its data. */
export type Look = Omit<SVGProps<SVGPathElement>, "d" | "ref">;

type FacesProps = {
  /** What `draw` returned. */
  faces: readonly Drawn[];
  hulls: readonly Silhouette[];
  /** Each role's look, such as `top`, `side` or a plate's role. */
  styles: Readonly<Record<string, Look>>;
};

/**
 * Faces as `draw` sorted them. Each part first fills its hull in its base
 * look, so the hairline gaps antialiasing leaves between side quads show the
 * part's own colour and never the page behind. The base look is the side's,
 * or for a part without sides drawn, its first face's.
 */
export function Faces({ faces, hulls, styles }: FacesProps) {
  return (
    <>
      {hulls.map((hull) => {
        const own = faces.filter((face) => face.part === hull.part);
        const base = own.some((face) => face.role === "side") ? "side" : own[0]?.role;
        return (
          <g key={hull.part}>
            {base !== undefined && <path d={hull.d} {...styles[base]} />}
            {own.map((face, index) => (
              <path key={index} d={face.d} {...styles[face.role]} />
            ))}
          </g>
        );
      })}
    </>
  );
}
