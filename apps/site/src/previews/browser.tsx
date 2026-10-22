import { Browser } from "@vectoys/browser";
import { Wallpaper } from "./wallpaper";

export const BrowserPreview = () => (
  <div className="preview-wide">
    <Browser url="vectoys.com" yaw={-22} pitch={-12}>
      <Wallpaper />
    </Browser>
  </div>
);
