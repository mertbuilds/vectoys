import { Phone, TURN } from "@vectoys/phone";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { clamp, tween, useReducedMotion, useSeen } from "./motion";

// Degrees per pixel dragged, and how fast a spin dies down after letting go.
const YAW_PER_PIXEL = 0.5;
const PITCH_PER_PIXEL = 0.3;
const PITCH = [-45, 25] as const;
const SETTLE_MS = 320;
// The first spin when the phone comes into view goes once round: v * SETTLE_MS = 360.
const HELLO = 360 / SETTLE_MS;

const SONGS = [
  "Morning light",
  "Slow river",
  "Paper planes",
  "Night drive",
  "Small hours",
  "Open window",
  "Long weekend",
  "Quiet room",
  "Salt and sun",
  "Last train home",
  "Blue hour",
  "Low tide",
  "Green line",
  "Paper moon",
  "Warm static",
  "Far shore",
  "Late summer",
  "Short cut",
  "Even keel",
  "Long way round",
];

/** A list long enough to scroll, on the phone's display. */
function Playlist() {
  return (
    <div className="playlist" data-live>
      <p className="playlist-title">Playlist</p>
      <ol>
        {SONGS.map((song, index) => (
          <li key={song}>
            <span className="playlist-index">{index + 1}</span>
            {song}
          </li>
        ))}
      </ol>
    </div>
  );
}

type Turn = { yaw: number; pitch: number };

export function PhoneSection() {
  const reduced = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const seen = useSeen(stage);
  const [turn, setTurn] = useState<Turn>({ yaw: TURN.yaw, pitch: TURN.pitch });
  const current = useRef(turn);
  const drag = useRef<{ x: number; y: number; time: number; speed: number } | null>(null);
  const stop = useRef<() => void>(() => {});

  const set = (next: Turn) => {
    current.current = next;
    setTurn(next);
  };

  /** Keeps turning at `speed` degrees a millisecond, slowing until it rests. */
  const coast = (speed: number) => {
    stop.current();
    let last = performance.now();
    let id = requestAnimationFrame(function step(now) {
      const elapsed = now - last;
      last = now;
      set({ ...current.current, yaw: current.current.yaw + speed * elapsed });
      speed *= Math.exp(-elapsed / SETTLE_MS);
      if (Math.abs(speed) > 0.002) id = requestAnimationFrame(step);
    });
    stop.current = () => cancelAnimationFrame(id);
  };

  useEffect(() => {
    if (seen && !reduced) coast(HELLO);
    return () => stop.current();
  }, [seen, reduced]);

  const down = (event: PointerEvent<HTMLDivElement>) => {
    // The display's own content scrolls under a finger instead of turning the phone.
    if ((event.target as Element).closest("[data-live]")) return;
    stop.current();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, time: event.timeStamp, speed: 0 };
  };

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const from = drag.current;
    if (!from) return;
    const yaw = (event.clientX - from.x) * YAW_PER_PIXEL;
    const pitch = (event.clientY - from.y) * PITCH_PER_PIXEL;
    const elapsed = Math.max(event.timeStamp - from.time, 1);
    drag.current = { x: event.clientX, y: event.clientY, time: event.timeStamp, speed: 0.8 * (yaw / elapsed) + 0.2 * from.speed };
    set({ yaw: current.current.yaw + yaw, pitch: clamp(current.current.pitch - pitch, ...PITCH) });
  };

  const up = (event: PointerEvent<HTMLDivElement>) => {
    const from = drag.current;
    drag.current = null;
    // A drag that stopped before letting go has nothing left to carry.
    if (from && !reduced && event.timeStamp - from.time < 80) coast(from.speed);
  };

  const turnAround = () => {
    stop.current();
    const { yaw, pitch } = current.current;
    if (reduced) return set({ yaw: yaw + 180, pitch });
    stop.current = tween(yaw, yaw + 180, 900, (value) => set({ yaw: value, pitch: current.current.pitch }));
  };

  return (
    <section className="device">
      <div className="copy">
        <h2>Phone</h2>
        <p>Drag it to turn it any way. The list on its screen scrolls.</p>
      </div>
      <div className="stage stage-phone grab" ref={stage} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <Phone yaw={turn.yaw} pitch={turn.pitch}>
          <Playlist />
        </Phone>
      </div>
      <div className="controls">
        <button type="button" className="pill" onClick={turnAround}>
          Turn around
        </button>
      </div>
    </section>
  );
}
