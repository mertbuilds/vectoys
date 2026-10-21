import { Tablet, TURN, type Orientation } from "@vectoys/tablet";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { tween, useInFocus, useReducedMotion } from "../motion";

type Thing = { id: number; text: string; packed: boolean };

const START: Thing[] = [
  { id: 1, text: "Towel", packed: true },
  { id: 2, text: "Sunscreen", packed: false },
  { id: 3, text: "A paperback", packed: false },
  { id: 4, text: "Water bottle", packed: true },
];

/** A packing list on the tablet's display: tick things off, add your own. */
function PackingList() {
  const [things, setThings] = useState(START);
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const packed = things.filter((thing) => thing.packed).length;

  const add = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setThings((before) => [...before, { id: Math.max(0, ...before.map((thing) => thing.id)) + 1, text, packed: false }]);
    setDraft("");
  };
  const toggle = (id: number) => setThings((before) => before.map((thing) => (thing.id === id ? { ...thing, packed: !thing.packed } : thing)));

  return (
    <div className="pack">
      <p className="pack-title">A day at the sea</p>
      <p className="pack-count">
        {packed} of {things.length} packed
      </p>
      <ul>
        {things.map((thing) => (
          <li key={thing.id}>
            <label>
              <input type="checkbox" checked={thing.packed} onChange={() => toggle(thing.id)} />
              <span>{thing.text}</span>
            </label>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="pack-add">
        <label htmlFor={inputId} className="visually-hidden">
          Something to pack
        </label>
        <input id={inputId} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add something to pack" autoComplete="off" />
        <button type="submit">Add</button>
      </form>
    </div>
  );
}

const ROLL_MS = 700;
const FACE_MS = 1600;

export function LiveScreen() {
  const reduced = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const inFocus = useInFocus(stage);
  // It waits with its back to the page, and turns round to face it when looked at.
  const [yaw, setYaw] = useState<number>(TURN.yaw + 180);
  const [roll, setRoll] = useState(0);
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [busy, setBusy] = useState(false);
  const stop = useRef<() => void>(() => {});
  useEffect(() => () => stop.current(), []);

  useEffect(() => {
    if (reduced) return setYaw(TURN.yaw);
    if (!inFocus) return;
    stop.current = tween(TURN.yaw + 180, TURN.yaw, FACE_MS, setYaw);
    return () => stop.current();
  }, [inFocus, reduced]);

  // The body rolls a quarter turn, and only then does the content lay out level for the new shape.
  const rotate = () => {
    const next = orientation === "portrait" ? "landscape" : "portrait";
    if (reduced) return setOrientation(next);
    setBusy(true);
    stop.current = tween(0, next === "landscape" ? -90 : 90, ROLL_MS, setRoll, () => {
      setOrientation(next);
      setRoll(0);
      setBusy(false);
    });
  };

  return (
    <section className="section stacked" aria-labelledby="live-screen">
      <div className="section-copy section-copy-center">
        <h2 id="live-screen">The screen is real</h2>
        <p>
          What sits on a screen is ordinary HTML, laid onto the glass with a CSS transform. Tick a box, type something in, select the text.
          Find in page finds it, and a screen reader reads it.
        </p>
        <p>Turn the tablet on its side and the list lays out again for the wider screen.</p>
      </div>
      <div className="tablet-wrap">
        <div className="tablet-stage" ref={stage}>
          <Tablet yaw={yaw} roll={roll} orientation={orientation}>
            <PackingList />
          </Tablet>
        </div>
        <div className="controls">
          <button type="button" className="button" onClick={rotate} disabled={busy}>
            {orientation === "portrait" ? "Turn on its side" : "Stand it upright"}
          </button>
        </div>
      </div>
    </section>
  );
}
