import { Watch } from "@vectoys/watch";
import { Wallpaper } from "./wallpaper";

export const WatchPreview = () => (
  <div className="preview-small">
    <Watch yaw={-26} pitch={-14}>
      <Wallpaper />
    </Watch>
  </div>
);
