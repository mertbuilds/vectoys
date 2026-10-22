import { Card } from "@vectoys/card";

export const CardPreview = () => (
  <div className="preview-card">
    <Card
      label="Flip the card"
      front={
        <div className="face">
          <strong>Front</strong>
          <span>Click to flip</span>
        </div>
      }
      back={
        <div className="face face-back">
          <strong>Back</strong>
          <span>Live HTML on both sides</span>
        </div>
      }
    />
  </div>
);
