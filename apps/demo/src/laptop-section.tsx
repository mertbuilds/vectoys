import { DESK, Laptop, PHONE } from "@hinge/laptop-14";
import { useEffect, useRef, useState } from "react";
import { clamp, useMedia, useReducedMotion } from "./motion";

/**
 * How far shut the lid is for where the laptop sits in the viewport: shut as
 * its top comes up past the bottom edge, open once its middle reaches the
 * viewport's middle.
 */
function lidFor(box: DOMRect, viewport: number) {
  const middle = box.top + box.height / 2;
  return clamp((middle - viewport / 2) / ((viewport + box.height) / 2), 0, 1);
}

/** A tiny app on the laptop's display, to show it is live: it clicks and takes typing. */
function Desk() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState("");
  return (
    <div className="desk">
      <p className="desk-note">This screen is live HTML</p>
      <h3>Hello, {name.trim() || "there"}</h3>
      <div className="desk-row">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Type your name" aria-label="Your name" />
        <button type="button" onClick={() => setCount((count) => count + 1)}>
          Clicked {count} {count === 1 ? "time" : "times"}
        </button>
      </div>
    </div>
  );
}

export function LaptopSection() {
  const reduced = useReducedMotion();
  const narrow = useMedia("(max-width: 640px)");
  const stage = useRef<HTMLDivElement>(null);
  const [closed, setClosed] = useState(reduced ? 0 : 1);

  // The lid follows the scroll; with reduced motion it stays where the slider puts it.
  useEffect(() => {
    if (reduced) return;
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

  return (
    <section className="device">
      <div className="copy">
        <h2>Laptop</h2>
        <p>The lid opens as you scroll. Click the button and type on its screen.</p>
      </div>
      <div className="stage stage-laptop" ref={stage}>
        <Laptop closed={closed} eye={narrow ? PHONE : DESK}>
          <Desk />
        </Laptop>
      </div>
      <div className="controls">
        <label className="slider">
          <span>Lid</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={1 - closed}
            onChange={(event) => setClosed(1 - Number(event.target.value))}
            aria-label="How far the lid is open"
          />
        </label>
      </div>
    </section>
  );
}
