import { camera, draw, slab } from "@vinena/vectoys";

// A plain rounded block, drawn by the engine in outline, for items whose
// preview the site does not have yet.
const BLOCK = [slab({ name: "block", box: [-16, -16, 16, 16], radii: [5, 5], thickness: 14, edge: 2, step: 1 })];
const EYE = camera({ width: 100, height: 80, perspective: 260, yaw: -32, pitch: -28 });
const { faces } = draw(BLOCK, EYE);
const OUTLINE = faces.map((face) => face.d).join("");

export const Placeholder = () => (
  <div className="preview-placeholder">
    <svg viewBox={`0 0 ${EYE.width} ${EYE.height}`} aria-hidden="true">
      <path d={OUTLINE} />
    </svg>
    <p>Preview on its way</p>
  </div>
);
