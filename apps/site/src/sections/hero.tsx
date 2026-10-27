import { Phone, TURN } from "@vectoys/phone";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CopyCommand } from "../components/copy-command";
import { addCommand } from "../registry";
import { clamp, useInFocus, useReducedMotion } from "../motion";

const COMMAND = addCommand("phone");

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
/** How far along `from` to `to` the time `t` is, eased, from 0 to 1. */
const span = (t: number, from: number, to: number) => ease(clamp((t - from) / (to - from), 0, 1));
const mix = (a: number, b: number, share: number) => a + (b - a) * share;

/*
 * The loop, in milliseconds: the phone shows its back, turns to the front, a
 * cursor scrolls the site on its glass and selects a line, then the phone eases
 * to a three-quarter view and sways, and keeps turning the same way round to
 * its back. The page draws it at STILL, the three-quarter view with the line
 * selected, and the loop starts from there, so the first frame is in the HTML
 * and reduced motion keeps it.
 */
const LOOP = 12000;
const STILL = 8000;
const BACK = TURN.yaw + 180;
const FRONT = 0;
const QUARTER = TURN.yaw;
// How long the clock may skip in one frame, as after a hidden tab comes back.
const LONGEST_FRAME = 200;
// The loop redraws about 30 times a second.
const FRAME_MS = 33;

/** How far the small site scrolls to bring the selected line up, in its own pixels. */
const SCROLL = 410;
const LINE = "Roasted on Monday, at your door by Friday";

function poseAt(t: number) {
  if (t < 500) return { yaw: BACK, pitch: -10 };
  if (t < 2100) {
    const share = span(t, 500, 2100);
    return { yaw: mix(BACK, FRONT, share), pitch: mix(-10, -4, share) };
  }
  if (t < 6600) return { yaw: FRONT, pitch: -4 };
  if (t < STILL) {
    const share = span(t, 6600, STILL);
    return { yaw: mix(FRONT, QUARTER, share), pitch: mix(-4, -10, share) };
  }
  if (t < 10600) {
    const angle = ((t - STILL) / 2600) * Math.PI * 2;
    return { yaw: QUARTER + 6 * Math.sin(angle), pitch: -10 + 1.5 * Math.sin(angle * 2) };
  }
  return { yaw: mix(QUARTER, QUARTER - 180, span(t, 10600, LOOP)), pitch: -10 };
}

/** Whether the glass faces the eye enough to hold still under a pointer. */
const facing = (t: number) => t >= 2100 && t < 10600;

const scrollAt = (t: number) => (t < 2500 || t > 11000 ? 0 : SCROLL * (span(t, 2500, 3300) * 0.55 + span(t, 3400, 4200) * 0.45));
const selectedAt = (t: number) => (t < 4900 || t > 11000 ? 0 : span(t, 4900, 6000));

/** Where the line to select sits in the small site's own layout. */
type Line = { top: number; left: number; height: number; width: number };

/** The cursor that scrolls the site and drags across the line, in the site's own pixels. */
function cursorAt(t: number, line: Line, scroll: number) {
  const y = line.top - scroll + line.height / 2;
  const hidden = { x: 300, y: 760, opacity: 0, beam: false };
  if (t < 2100 || t >= 6900) return hidden;
  const opacity = clamp((t - 2100) / 300, 0, 1) * (1 - clamp((t - 6500) / 400, 0, 1));
  if (t < 4200) {
    const share = span(t, 2100, 2600);
    return { x: mix(320, 250, share), y: mix(780, 560, share), opacity, beam: false };
  }
  if (t < 4900) {
    const share = span(t, 4200, 4900);
    return { x: mix(250, line.left, share), y: mix(560, y, share), opacity, beam: share > 0.6 };
  }
  if (t < 6000) return { x: line.left + line.width * selectedAt(t), y, opacity, beam: true };
  const share = span(t, 6000, 6900);
  return { x: mix(line.left + line.width, 330, share), y: mix(y, 700, share), opacity, beam: false };
}

const Arrow = () => (
  <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
    <path d="M5 3l14 8.5-6.2 1.3L9.6 19z" fill="#111" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

const BEAM = "M9 4h2.5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H9M15 4h-2.5M15 20h-2.5";
const IBeam = () => (
  <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
    <path d={BEAM} fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" />
    <path d={BEAM} fill="none" stroke="#111" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/**
 * A small coffee shop's site on the glass, laid out 393 pixels across. The
 * selected part of the line is drawn as a selection, so the visitor's own
 * selection is never taken over.
 */
function CoffeeSite({ scroll, selected, lineRef }: { scroll: number; selected: number; lineRef: React.RefObject<HTMLSpanElement | null> }) {
  const chars = Math.round(LINE.length * selected);
  return (
    <div className="ms" style={{ transform: `translateY(${-scroll}px)` }}>
      <div className="ms-nav">
        <span className="ms-logo">Dune Coffee</span>
        <span className="ms-menu">Menu</span>
      </div>
      <p className="ms-h1">Small batch coffee, roasted every Monday</p>
      <p className="ms-p">Beans from four farms we visit each year. We roast twelve kilos at a time, then pack them by hand.</p>
      <span className="ms-button">Shop beans</span>
      <div className="ms-photo">
        <span>Ethiopia Guji, washed</span>
      </div>
      <p className="ms-h2">How it works</p>
      <p className="ms-p ms-line">
        <span ref={lineRef}>
          {chars > 0 && <span className="ms-selected">{LINE.slice(0, chars)}</span>}
          {LINE.slice(chars)}
        </span>
      </p>
      <p className="ms-p">Pick a bag, pick a grind, and we send it on the next roast. Skip a week any time from your account.</p>
      <div className="ms-list">
        <span>Colombia Huila, honey</span>
        <span>Kenya Nyeri, washed</span>
        <span>Brazil Cerrado, natural</span>
      </div>
      <p className="ms-h2">Visit the roastery</p>
      <p className="ms-p">12 Harbor Lane. Open for tastings on Saturday mornings.</p>
    </div>
  );
}

/** The loop's clock. It runs while `running`, and holds where it is otherwise. */
function useLoopClock(running: boolean) {
  const [t, setT] = useState(STILL);
  const clock = useRef(STILL);
  useEffect(() => {
    if (!running) return;
    let id = 0;
    let last = performance.now();
    let drawn = 0;
    const step = (now: number) => {
      id = requestAnimationFrame(step);
      clock.current = (clock.current + Math.min(now - last, LONGEST_FRAME)) % LOOP;
      last = now;
      if (now - drawn < FRAME_MS) return;
      drawn = now;
      setT(clock.current);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [running]);
  return t;
}

/** Whether the element is on screen at all, kept up to date. */
function useOnScreen(ref: React.RefObject<Element | null>) {
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry?.isIntersecting ?? true));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return onScreen;
}

function HeroPhone() {
  const reduced = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const inFocus = useInFocus(stage);
  const onScreen = useOnScreen(stage);
  const [pointer, setPointer] = useState(false);
  const [line, setLine] = useState<Line | null>(null);
  const [held, setHeld] = useState(false);
  const t = useLoopClock(inFocus && onScreen && !reduced && !held);

  // A pointer on the phone holds the loop once the glass faces the eye, so the visitor can select the text.
  useEffect(() => {
    setHeld(pointer && facing(t));
  }, [pointer, t]);

  useLayoutEffect(() => {
    const measure = () => {
      const element = lineRef.current;
      const site = element?.closest<HTMLElement>(".ms");
      if (!element || !site) return;
      let top = 0;
      let left = 0;
      for (let node: HTMLElement | null = element; node && node !== site; node = node.offsetParent as HTMLElement | null) {
        top += node.offsetTop;
        left += node.offsetLeft;
      }
      setLine({ top, left, height: element.offsetHeight, width: element.offsetWidth });
    };
    measure();
    void document.fonts?.ready.then(measure);
  }, []);

  const { yaw, pitch } = poseAt(t);
  const scroll = scrollAt(t);
  const cursor = line && !held ? cursorAt(t, line, scroll) : null;

  return (
    <div ref={stage} className="hero-stage">
      <div className="hero-phone" data-replay-block="" onPointerEnter={() => setPointer(true)} onPointerLeave={() => setPointer(false)}>
        <Phone yaw={yaw} pitch={pitch} label="A phone with a coffee shop's site on its screen">
          <div className="ms-viewport">
            <CoffeeSite scroll={scroll} selected={selectedAt(t)} lineRef={lineRef} />
            {cursor && cursor.opacity > 0 && (
              <div
                className="ms-cursor"
                aria-hidden="true"
                style={{ transform: `translate(${cursor.x - (cursor.beam ? 15 : 6)}px, ${cursor.y - (cursor.beam ? 15 : 4)}px)`, opacity: cursor.opacity }}
              >
                {cursor.beam ? <IBeam /> : <Arrow />}
              </div>
            )}
          </div>
        </Phone>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-inner">
        <div className="hero-copy">
          <h1 id="hero-title">Draw anything on the web with SVGs</h1>
          <p className="lede">
            Phones, laptops and small toys for your React landing page. The screen is live HTML you can scroll and select. No WebGL, no images,
            MIT.
          </p>
          <CopyCommand command={COMMAND} className="command-hero" />
          <p className="hero-note">The text on that screen is HTML. Try to select it.</p>
        </div>
        <HeroPhone />
      </div>
    </section>
  );
}
