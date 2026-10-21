import { Tablet, TURN, type Orientation } from "@hinge/tablet";
import { useEffect, useRef, useState } from "react";
import { tween, useReducedMotion } from "./motion";

const TASKS = ["Water the plants", "Call the bakery", "Fix the bike light", "Book the train", "Write back to Sam", "Pick up the prints"];

/** A short checklist that lays out in one column upright and two on its side. */
function Checklist() {
  const [done, setDone] = useState<ReadonlySet<string>>(new Set(["Call the bakery"]));
  const toggle = (task: string) =>
    setDone((before) => {
      const after = new Set(before);
      if (!after.delete(task)) after.add(task);
      return after;
    });
  return (
    <div className="checklist">
      <p className="checklist-title">Today</p>
      <p className="checklist-count">
        {done.size} of {TASKS.length} done
      </p>
      <ul>
        {TASKS.map((task) => (
          <li key={task}>
            <label>
              <input type="checkbox" checked={done.has(task)} onChange={() => toggle(task)} />
              <span>{task}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TURN_MS = 700;

export function TabletSection() {
  const reduced = useReducedMotion();
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [roll, setRoll] = useState(0);
  const [yaw, setYaw] = useState<number>(TURN.yaw);
  const [busy, setBusy] = useState(false);
  const stop = useRef<() => void>(() => {});
  useEffect(() => () => stop.current(), []);

  // The body rolls a quarter turn with its content, and only then does the
  // content lay out level for the new orientation, from where the roll ended.
  const rotate = () => {
    const next = orientation === "portrait" ? "landscape" : "portrait";
    if (reduced) return setOrientation(next);
    setBusy(true);
    stop.current = tween(0, next === "landscape" ? -90 : 90, TURN_MS, setRoll, () => {
      setOrientation(next);
      setRoll(0);
      setBusy(false);
    });
  };

  const turnAround = () => {
    const to = yaw + 180;
    if (reduced) return setYaw(to);
    setBusy(true);
    stop.current = tween(yaw, to, 900, setYaw, () => setBusy(false));
  };

  return (
    <section className="device">
      <div className="copy">
        <h2>Tablet</h2>
        <p>Turn it on its side. Its screen lays out again for the new shape.</p>
      </div>
      <div className="stage stage-tablet">
        <Tablet yaw={yaw} roll={roll} orientation={orientation}>
          <Checklist />
        </Tablet>
      </div>
      <div className="controls">
        <button type="button" className="pill" onClick={rotate} disabled={busy}>
          {orientation === "portrait" ? "Turn on its side" : "Stand it upright"}
        </button>
        <button type="button" className="pill" onClick={turnAround} disabled={busy}>
          Turn around
        </button>
      </div>
    </section>
  );
}
