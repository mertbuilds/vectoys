import { Monitor } from "@vectoys/monitor";
import { Wallpaper } from "./wallpaper";

export const MonitorPreview = () => (
  <div className="preview-square">
    <Monitor yaw={-24} pitch={-10}>
      <Wallpaper />
    </Monitor>
  </div>
);
