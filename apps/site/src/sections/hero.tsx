import { DESK, Laptop, PHONE } from "@vectoys/laptop";
import { useEffect, useRef, useState } from "react";
import { CopyCommand } from "../components/copy-command";
import { GitHubMark } from "../components/icons";
import { REPO, addCommand } from "../registry";
import { clamp, useMedia, useReducedMotion } from "../motion";

const COMMAND = addCommand("laptop");
const FOLDER = "src/components/vectoys/laptop";

// What the CLI prints for this command in a fresh npm project with a src folder.
const OUTPUT = [
  "Wrote vectoys.json. Items go to src/components/vectoys, from https://vectoys.com/r.",
  "Packages install with npm.",
  `Wrote    ${FOLDER}/geometry.ts`,
  `Wrote    ${FOLDER}/laptop.tsx`,
  "Running  npm install @vectoys/engine @vectoys/react",
  "added 2 packages in 2s",
];

// How far the run has got: first each character of the command, then each line of output.
const END = COMMAND.length + OUTPUT.length;

const TYPE_FROM = 300;
const PAUSE = 450;
const LINE_MS = 190;

/** When each step of the run shows, in milliseconds from the lid coming fully open. */
function schedule() {
  const times: number[] = [];
  let at = TYPE_FROM;
  for (let index = 0; index < COMMAND.length; index++) times.push((at += 38 + ((index * 37) % 45)));
  at += PAUSE;
  for (let index = 0; index < OUTPUT.length; index++) times.push((at += index === OUTPUT.length - 1 ? 900 : LINE_MS));
  return times;
}

const Prompt = () => (
  <span className="term-prompt">
    ~/my-site <span className="term-dollar">$</span>{" "}
  </span>
);

/** A terminal window on the laptop's desktop, running the install. */
function Terminal({ step }: { step: number }) {
  const typed = COMMAND.slice(0, step);
  const lines = OUTPUT.slice(0, Math.max(0, step - COMMAND.length));
  const done = step >= END;
  return (
    <div className="desktop" aria-hidden="true">
      <div className="term">
        <div className="term-bar">
          <span className="term-lights">
            <i />
            <i />
            <i />
          </span>
          <span className="term-title">my-site</span>
        </div>
        <div className="term-body">
          <p>
            <Prompt />
            {typed}
            {!done && <span className="term-cursor" />}
          </p>
          {lines.map((line) => (
            <p key={line} className="term-out">
              {line}
            </p>
          ))}
          {done && (
            <p>
              <Prompt />
              <span className="term-cursor" />
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * How far shut the lid is for where the laptop sits in the viewport: part
 * open as the page loads, fully open once its middle comes up to 60% of the
 * viewport's height.
 */
function lidFor(box: DOMRect, viewport: number) {
  const middle = box.top + box.height / 2;
  return clamp((middle - viewport * 0.6) / ((viewport + box.height) / 2), 0, 1);
}

export function Hero() {
  const reduced = useReducedMotion();
  const narrow = useMedia("(max-width: 640px)");
  const stage = useRef<HTMLDivElement>(null);
  const [closed, setClosed] = useState(0.5);
  const [step, setStep] = useState(0);
  const open = closed < 0.05;
  const [typing, setTyping] = useState(false);

  // The lid follows the scroll, so it opens as the laptop comes up into view.
  useEffect(() => {
    if (reduced) {
      setClosed(0);
      setStep(END);
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      if (stage.current) setClosed(lidFor(stage.current.getBoundingClientRect(), innerHeight));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
    };
  }, [reduced]);

  // The command types itself the first time the lid is all the way open.
  useEffect(() => {
    if (open && !reduced) setTyping(true);
  }, [open, reduced]);
  useEffect(() => {
    if (!typing) return;
    const timers = schedule().map((at, index) => setTimeout(() => setStep(index + 1), at));
    return () => timers.forEach(clearTimeout);
  }, [typing]);

  return (
    <section className="hero">
      <div className="hero-copy">
        <h1>3D toys for the web, drawn in plain SVG</h1>
        <p className="lede">
          Laptops, phones and small objects for your landing page. They render on the server, stay sharp at any size and carry live HTML on
          their screens. No WebGL, no canvas, no images.
        </p>
        <div className="hero-actions">
          <CopyCommand command={COMMAND} />
          <a href={REPO} target="_blank" rel="noreferrer" className="button">
            <GitHubMark /> View on GitHub
          </a>
        </div>
      </div>
      <div className="hero-stage" ref={stage}>
        <Laptop closed={closed} eye={narrow ? PHONE : DESK}>
          <Terminal step={step} />
        </Laptop>
      </div>
    </section>
  );
}
