import { fixed, screenQuad, type Camera, type Pose, type ScreenRect } from "@hinge/engine";
import type { CSSProperties, ReactNode } from "react";

/**
 * CSS pixels per scene unit in the layer screens are laid out in. Any
 * constant works; at 20 a 14 inch laptop's glass is about 1280 pixels wide,
 * so its content lays out as on the real display.
 */
export const PIXELS_PER_UNIT = 20;

type ScreenProps = {
  camera: Camera;
  /** The pose in the scene of the part the screen lies on. */
  pose: Pose;
  /** Where on the part, in the part's own units. */
  rect: ScreenRect;
  /**
   * The width the content lays out at, in CSS pixels; its height follows from
   * the rectangle's. By default the rectangle at `PIXELS_PER_UNIT`.
   */
  width?: number;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * Live HTML laid onto a part's face, for use as a `Stage`'s overlay.
 *
 * The content lays out at a fixed size in a layer `PIXELS_PER_UNIT` times
 * the scene, so `screenQuad`'s matrix is a constant that needs no measuring.
 * The layer is then scaled to the stage's width in CSS alone: under
 * `perspective(d)`, `translateZ(z)` scales by d / (d - z), and with d the
 * stage's width (`100cqw`) and d - z the layer's, that is the stage over the
 * layer. So the server's markup is final, and hydration moves nothing.
 *
 * While the face turns away the content stays mounted but is hidden, and
 * takes no pointer events; the layer never takes any.
 */
export function Screen({ camera, pose, rect, width, children, className, style }: ScreenProps) {
  const across = fixed(width ?? rect.width * PIXELS_PER_UNIT);
  const element = { width: across, height: fixed((across * rect.height) / rect.width) };
  const quad = screenQuad(camera, pose, rect, element, PIXELS_PER_UNIT);
  const layer = fixed(camera.width * PIXELS_PER_UNIT);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: layer,
        height: fixed(camera.height * PIXELS_PER_UNIT),
        transformOrigin: "0 0",
        transform: `perspective(100cqw) translateZ(calc(100cqw - ${layer}px))`,
        pointerEvents: "none",
      }}
    >
      <div
        className={className}
        style={{
          ...style,
          position: "absolute",
          left: 0,
          top: 0,
          width: element.width,
          height: element.height,
          transformOrigin: "0 0",
          transform: quad.matrix,
          visibility: quad.facing ? "visible" : "hidden",
          pointerEvents: quad.facing ? "auto" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
