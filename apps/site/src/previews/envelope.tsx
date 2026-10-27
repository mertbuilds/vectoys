import { Envelope } from "@vectoys/envelope";

export const EnvelopePreview = () => (
  <div className="preview-small">
    <Envelope label="Open the letter">
      <div className="letter">
        <strong>New toys, once a month</strong>
        <span>A short letter when something new lands in the gallery.</span>
      </div>
    </Envelope>
  </div>
);
