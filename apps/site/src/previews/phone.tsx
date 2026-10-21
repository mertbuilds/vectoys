import { Phone } from "@vectoys/phone";
import { Wallpaper } from "./wallpaper";

export const PhonePreview = () => (
  <div className="preview-square">
    <Phone yaw={24} pitch={-14}>
      <Wallpaper />
    </Phone>
  </div>
);
