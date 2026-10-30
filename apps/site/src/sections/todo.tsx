import { useEffect, useId, useRef, useState, type Dispatch, type FormEvent, type PointerEvent } from "react";

export type Todo = { id: number; text: string; done: boolean };
export type Todos = { items: Todo[]; next: number };
export type TodoAction = { type: "add"; text: string } | { type: "set"; id: number; done: boolean } | { type: "remove"; id: number };
export type Filter = "all" | "active" | "done";

/** The longest to-do the app keeps, so one never runs off its row. */
export const MAX_LENGTH = 80;

/** The list a visitor finds on the phone: four plain errands, one already done. */
export const START: Todos = {
  items: [
    { id: 1, text: "Buy oat milk", done: false },
    { id: 2, text: "Book the dentist for Thursday", done: false },
    { id: 3, text: "Send the invoice to Studio North", done: false },
    { id: 4, text: "Water the plants", done: true },
  ],
  next: 5,
};

/** The list after one change. A change that changes nothing returns the same list. */
export function todosReducer(state: Todos, action: TodoAction): Todos {
  switch (action.type) {
    case "add": {
      const text = action.text.trim().slice(0, MAX_LENGTH);
      if (!text) return state;
      // The newest goes on top, where the visitor can see it land.
      return { items: [{ id: state.next, text, done: false }, ...state.items], next: state.next + 1 };
    }
    case "set":
      if (!state.items.some((item) => item.id === action.id && item.done !== action.done)) return state;
      return { ...state, items: state.items.map((item) => (item.id === action.id ? { ...item, done: action.done } : item)) };
    case "remove":
      if (!state.items.some((item) => item.id === action.id)) return state;
      return { ...state, items: state.items.filter((item) => item.id !== action.id) };
  }
}

export const shownFor = (items: Todo[], filter: Filter) => (filter === "all" ? items : items.filter((item) => item.done === (filter === "done")));

const FILTERS: { value: Filter; label: string; empty: string }[] = [
  { value: "all", label: "All", empty: "Nothing here yet" },
  { value: "active", label: "Active", empty: "All done" },
  { value: "done", label: "Done", empty: "Nothing done yet" },
];

// A row swipes once the pointer has moved this far across, and a swipe past this share of the row deletes it.
const SWIPE_FROM = 8;
const SWIPE_DELETE = 0.4;
// How long a row takes to slide out and close its gap, as in the stylesheet.
const LEAVE_MS = 340;

/** The nearest row from `from` on, in one direction, that is not on its way out. */
function staying(from: Element | null, step: (row: Element) => Element | null) {
  for (let row = from; row; row = step(row)) if (!row.classList.contains("todo-row-leaving")) return row;
  return null;
}

/** Moves focus off a row that is about to go, to the same control on the nearest row that stays, or else to the new to-do field. */
function handOffFocus(row: HTMLElement, selector: string) {
  if (!row.contains(document.activeElement)) return;
  const beside = (staying(row.nextElementSibling, (next) => next.nextElementSibling) ?? staying(row.previousElementSibling, (previous) => previous.previousElementSibling))?.querySelector<HTMLElement>(selector);
  (beside ?? row.closest(".todo-app")?.querySelector<HTMLElement>(".todo-input"))?.focus();
}

type Swipe = { id: number; x: number; y: number; scale: number; active: boolean; offset: number };

function TodoRow({ todo, filter, reduced, dispatch }: { todo: Todo; filter: Filter; reduced: boolean; dispatch: Dispatch<TodoAction> }) {
  const row = useRef<HTMLLIElement>(null);
  const check = useRef<HTMLButtonElement>(null);
  const textId = useId();
  const swipe = useRef<Swipe | null>(null);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const wasDone = useRef(todo.done);

  // The box pops as it fills; its fill, check mark and strike line are transitions in the stylesheet.
  useEffect(() => {
    if (wasDone.current === todo.done) return;
    wasDone.current = todo.done;
    if (todo.done && !reduced) check.current?.animate([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], { duration: 280, easing: "cubic-bezier(0.2, 0, 0, 1)" });
  }, [todo.done, reduced]);

  const toggle = () => {
    // Under a filter the row leaves the list once it changes, so focus moves on first.
    if (filter !== "all" && row.current) handOffFocus(row.current, ".todo-check");
    dispatch({ type: "set", id: todo.id, done: !todo.done });
  };

  const remove = () => {
    if (leaving) return;
    if (row.current) handOffFocus(row.current, ".todo-delete");
    if (reduced) {
      dispatch({ type: "remove", id: todo.id });
      return;
    }
    setLeaving(true);
    setTimeout(() => dispatch({ type: "remove", id: todo.id }), LEAVE_MS);
  };

  const down = (event: PointerEvent<HTMLLIElement>) => {
    // One finger swipes a row at a time; a second one while it swipes is ignored.
    if (event.button !== 0 || !event.isPrimary || swipe.current?.active || leaving) return;
    const element = event.currentTarget;
    // The glass is drawn smaller than it lays out, so a pointer's pixels on screen are fewer than the row's own.
    const scale = element.getBoundingClientRect().width / element.offsetWidth || 1;
    swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY, scale, active: false, offset: 0 };
  };

  const move = (event: PointerEvent<HTMLLIElement>) => {
    const current = swipe.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.active) {
      if (event.buttons === 0) {
        swipe.current = null;
        return;
      }
      if (Math.hypot(dx, dy) < SWIPE_FROM) return;
      // A move more up and down than across is a scroll, not a swipe.
      if (Math.abs(dy) > Math.abs(dx)) {
        swipe.current = null;
        return;
      }
      current.active = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setSwiping(true);
    }
    current.offset = Math.min(0, dx / current.scale);
    setOffset(current.offset);
  };

  const up = (event: PointerEvent<HTMLLIElement>) => {
    const current = swipe.current;
    if (!current || current.id !== event.pointerId) return;
    swipe.current = null;
    if (!current.active) return;
    setSwiping(false);
    if (event.type === "pointerup" && -current.offset > event.currentTarget.offsetWidth * SWIPE_DELETE) remove();
    else setOffset(0);
  };

  const classes = ["todo-row", todo.done && "todo-row-done", swiping && "todo-row-swiping", (offset < 0 || leaving) && "todo-row-open", leaving && "todo-row-leaving"];
  return (
    <li ref={row} className={classes.filter(Boolean).join(" ")} data-todo={todo.id} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <span className="todo-under" aria-hidden="true">
        Delete
      </span>
      <div className="todo-body" style={offset < 0 && !leaving ? { transform: `translateX(${offset}px)` } : undefined}>
        <button ref={check} type="button" role="checkbox" aria-checked={todo.done} aria-labelledby={textId} className="todo-check" onClick={toggle}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6.5 12.5l3.6 3.6 7.4-8" pathLength={1} />
          </svg>
        </button>
        <span className="todo-text">
          <span id={textId}>{todo.text}</span>
        </span>
        <button type="button" className="todo-delete" aria-label={`Delete ${todo.text}`} onClick={remove}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 7l10 10M17 7L7 17" />
          </svg>
        </button>
      </div>
    </li>
  );
}

/**
 * A small to-do app laid out 393 pixels across, for the phone's glass. Its
 * list lives in the caller, so the hero's loop can tap the same boxes a
 * visitor taps; the filter and the field being typed are its own. `live`
 * reads the count aloud as it changes; the caller turns it off while its own
 * loop changes the list.
 */
export function TodoApp({ todos, dispatch, reduced, live = true }: { todos: Todos; dispatch: Dispatch<TodoAction>; reduced: boolean; live?: boolean }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const left = todos.items.filter((item) => !item.done).length;
  const counts: Record<Filter, number> = { all: todos.items.length, active: left, done: todos.items.length - left };
  const shown = shownFor(todos.items, filter);
  const empty = FILTERS.find((option) => option.value === filter)?.empty;

  const add = (event: FormEvent) => {
    event.preventDefault();
    input.current?.focus();
    if (!draft.trim()) return;
    dispatch({ type: "add", text: draft });
    setDraft("");
    // A new to-do is never done, so it shows under All rather than vanish under Done.
    if (filter === "done") setFilter("all");
  };

  return (
    <div className="todo-app">
      <div className="todo-head">
        <p className="todo-title">Today</p>
        <p className="todo-left" aria-live={live ? "polite" : "off"}>
          {left === 0 ? "Nothing left" : `${left} left`}
        </p>
      </div>
      <form className="todo-add" onSubmit={add}>
        <input
          ref={input}
          className="todo-input"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a to-do"
          aria-label="New to-do"
          maxLength={MAX_LENGTH}
          enterKeyHint="done"
          autoComplete="off"
        />
        <button type="submit" className="todo-add-button" aria-label="Add to-do">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 6v12M6 12h12" />
          </svg>
        </button>
      </form>
      <div className="todo-filters" role="group" aria-label="Show">
        {FILTERS.map((option) => (
          <button key={option.value} type="button" className="todo-filter" aria-pressed={filter === option.value} onClick={() => setFilter(option.value)}>
            {option.label}
            <span className="todo-count">{counts[option.value]}</span>
          </button>
        ))}
      </div>
      <div className="todo-scroll">
        {shown.length > 0 ? (
          <ul className="todo-list">
            {shown.map((todo) => (
              <TodoRow key={todo.id} todo={todo} filter={filter} reduced={reduced} dispatch={dispatch} />
            ))}
          </ul>
        ) : (
          <p className="todo-empty">{empty}</p>
        )}
      </div>
    </div>
  );
}
