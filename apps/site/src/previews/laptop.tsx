import { DESK, Laptop } from "@vectoys/laptop-14";
import { Wallpaper } from "./wallpaper";

export const LaptopPreview = () => (
  <div className="preview-laptop">
    <Laptop closed={0.04} eye={DESK}>
      <Wallpaper />
    </Laptop>
  </div>
);
