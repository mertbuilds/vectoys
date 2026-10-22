import { DESK, Laptop } from "@vectoys/laptop";
import { Wallpaper } from "./wallpaper";

export const LaptopPreview = () => (
  <div className="preview-laptop">
    <Laptop closed={0.04} eye={DESK}>
      <Wallpaper />
    </Laptop>
  </div>
);
