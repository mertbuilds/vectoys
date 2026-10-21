import type { Camera } from "@vectoys/engine";
import type { CSSProperties, ReactNode } from "react";

type StageProps = {
  /** The camera whose scene this is; its width and height make the viewBox and the aspect ratio. */
  camera: Pick<Camera, "width" | "height">;
  /** What the SVG draws, in the scene's units. */
  children?: ReactNode;
  /** HTML laid over the drawing, such as a `Screen`. */
  overlay?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * The box a scene is drawn in. It keeps the camera's aspect ratio at the
 * width of its parent and is a size container, so the drawing, the live
 * screens over it and anything sized in `cqw` scale together, and the server
 * draws it the same as the client.
 */
export function Stage({ camera, children, overlay, className, style }: StageProps) {
  return (
    <div
      className={className}
      style={{ position: "relative", width: "100%", aspectRatio: `${camera.width} / ${camera.height}`, containerType: "inline-size", ...style }}
    >
      <svg
        viewBox={`0 0 ${camera.width} ${camera.height}`}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
      >
        {children}
      </svg>
      {overlay}
    </div>
  );
}
