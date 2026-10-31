import { KeycapRow } from "@vectoys/keycap";

export const KeycapPreview = () => (
  <div className="preview-wide">
    <KeycapRow keys={["T", "O", "Y"]} label="toy" defaultSound soundToggle />
  </div>
);
