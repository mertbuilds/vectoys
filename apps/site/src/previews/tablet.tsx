import { Tablet } from "@vectoys/tablet";
import { Wallpaper } from "./wallpaper";

export const TabletPreview = () => (
  <div className="preview-square">
    <Tablet yaw={-18} pitch={-16} orientation="landscape">
      <Wallpaper />
    </Tablet>
  </div>
);
