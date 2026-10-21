import { useState, type CSSProperties } from "react";
import { LaptopSection } from "./laptop-section";
import { PhoneSection } from "./phone-section";
import { TabletSection } from "./tablet-section";

const FINISHES = [
  { name: "Silver", color: "#e6e6e3" },
  { name: "Slate", color: "#4a5361" },
  { name: "Sage", color: "#b8c2ae" },
  { name: "Sand", color: "#e0cfb8" },
] as const;

/** Sets `--hinge-finish` for every device inside it. */
function FinishPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="finishes" role="radiogroup" aria-label="Finish">
      {FINISHES.map(({ name, color }) => (
        <button
          key={name}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={name}
          title={name}
          className="swatch"
          style={{ background: color }}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );
}

export function App() {
  const [finish, setFinish] = useState<string>(FINISHES[0].color);
  return (
    <main>
      <header className="intro">
        <h1>hinge</h1>
        <p>Device mockups drawn as plain SVG, with live HTML on their screens. Scroll down.</p>
      </header>
      <LaptopSection />
      <div style={{ "--hinge-finish": finish } as CSSProperties}>
        <section className="finish-row">
          <h2>Finish</h2>
          <p>The colour of the phone and the tablet. Turn them around to see the back.</p>
          <FinishPicker value={finish} onChange={setFinish} />
        </section>
        <PhoneSection />
        <TabletSection />
      </div>
      <footer>
        <p>Every device on this page is SVG paths and HTML. No WebGL, no images.</p>
      </footer>
    </main>
  );
}
