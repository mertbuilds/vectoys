import { afterEach, describe, expect, test } from "bun:test";
import { act, useReducer } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MAX_LENGTH, START, TodoApp, shownFor, todosReducer } from "../src/sections/todo";

const roots: Root[] = [];

afterEach(() => {
  act(() => roots.splice(0).forEach((root) => root.unmount()));
  document.body.innerHTML = "";
});

describe("todosReducer", () => {
  test("adds a trimmed to-do on top and ignores an empty one", () => {
    const added = todosReducer(START, { type: "add", text: "  Call mom  " });
    expect(added.items[0]).toEqual({ id: 5, text: "Call mom", done: false });
    expect(added.items).toHaveLength(5);
    expect(added.next).toBe(6);
    expect(todosReducer(START, { type: "add", text: "   " })).toBe(START);
  });

  test("cuts a long to-do to the longest it keeps", () => {
    const added = todosReducer(START, { type: "add", text: "a".repeat(MAX_LENGTH + 20) });
    expect(added.items[0]?.text).toHaveLength(MAX_LENGTH);
  });

  test("checks, unchecks and removes, and returns the same list for no change", () => {
    const checked = todosReducer(START, { type: "set", id: 1, done: true });
    expect(checked.items.find((item) => item.id === 1)?.done).toBe(true);
    expect(todosReducer(checked, { type: "set", id: 1, done: true })).toBe(checked);
    expect(todosReducer(checked, { type: "set", id: 1, done: false }).items.find((item) => item.id === 1)?.done).toBe(false);
    expect(todosReducer(START, { type: "remove", id: 2 }).items.map((item) => item.id)).toEqual([1, 3, 4]);
    expect(todosReducer(START, { type: "remove", id: 99 })).toBe(START);
  });

  test("filters to active and done", () => {
    expect(shownFor(START.items, "active").map((item) => item.id)).toEqual([1, 2, 3]);
    expect(shownFor(START.items, "done").map((item) => item.id)).toEqual([4]);
    expect(shownFor(START.items, "all")).toBe(START.items);
  });
});

function Harness({ reduced = true, live = true }: { reduced?: boolean; live?: boolean }) {
  const [todos, dispatch] = useReducer(todosReducer, START);
  return <TodoApp todos={todos} dispatch={dispatch} reduced={reduced} live={live} />;
}

function mount(props: { reduced?: boolean; live?: boolean } = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  act(() => root.render(<Harness {...props} />));
  return { host, root };
}

const ids = (host: HTMLElement) => [...host.querySelectorAll("li")].map((row) => Number(row.getAttribute("data-todo")));

/** A row 300 pixels wide, with pointer capture, as a browser lays it out. */
function swipeRow(host: HTMLElement, id: number) {
  const row = host.querySelector<HTMLLIElement>(`[data-todo="${id}"]`);
  if (!row) throw new Error("no row");
  Object.defineProperty(row, "offsetWidth", { value: 300 });
  row.setPointerCapture = () => {};
  const fire = (type: string, pointerId: number, x: number, init: PointerEventInit = {}) =>
    act(() => {
      row.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId, clientX: x, clientY: 10, button: 0, buttons: type === "pointerup" ? 0 : 1, isPrimary: true, ...init }));
    });
  const body = () => row.querySelector<HTMLElement>(".todo-body")?.style.transform ?? "";
  return { row, fire, body };
}

describe("TodoApp", () => {
  test("adds with the form, checks, deletes and filters", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    roots.push(root);
    act(() => root.render(<Harness />));
    const texts = () => [...host.querySelectorAll(".todo-text")].map((element) => element.textContent);
    const left = () => host.querySelector(".todo-left")?.textContent;
    expect(left()).toBe("3 left");

    const input = host.querySelector<HTMLInputElement>(".todo-input");
    const form = host.querySelector("form");
    if (!input || !form) throw new Error("no form");
    act(() => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setValue?.call(input, "Call mom");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => form.requestSubmit());
    expect(texts()[0]).toBe("Call mom");
    expect(input.value).toBe("");
    expect(left()).toBe("4 left");

    const check = host.querySelector<HTMLButtonElement>('[data-todo="5"] .todo-check');
    act(() => check?.click());
    expect(check?.getAttribute("aria-checked")).toBe("true");
    expect(left()).toBe("3 left");

    act(() => host.querySelector<HTMLButtonElement>('[aria-label="Delete Buy oat milk"]')?.click());
    expect(texts()).not.toContain("Buy oat milk");

    const filter = (label: string) => [...host.querySelectorAll<HTMLButtonElement>(".todo-filter")].find((button) => button.firstChild?.textContent === label);
    act(() => filter("Done")?.click());
    expect(filter("Done")?.getAttribute("aria-pressed")).toBe("true");
    expect(texts()).toEqual(["Call mom", "Water the plants"]);
    act(() => filter("Active")?.click());
    expect(texts()).toEqual(["Book the dentist for Thursday", "Send the invoice to Studio North"]);
    act(() => host.querySelectorAll<HTMLButtonElement>(".todo-check").forEach((button) => button.click()));
    expect(host.querySelector(".todo-empty")?.textContent).toBe("All done");
    act(() => root.unmount());
  });

  test("reads the count aloud only when live", () => {
    const quiet = mount({ live: false });
    expect(quiet.host.querySelector(".todo-left")?.getAttribute("aria-live")).toBe("off");
    act(() => quiet.root.unmount());
    const live = mount();
    expect(live.host.querySelector(".todo-left")?.getAttribute("aria-live")).toBe("polite");
    act(() => live.root.unmount());
  });

  test("a swipe past 40% of the row deletes it", () => {
    const { host, root } = mount();
    const { fire } = swipeRow(host, 2);
    fire("pointerdown", 1, 300);
    fire("pointermove", 1, 250);
    fire("pointermove", 1, 160);
    fire("pointerup", 1, 160);
    expect(ids(host)).toEqual([1, 3, 4]);
    act(() => root.unmount());
  });

  test("a short swipe or a cancelled one springs back", () => {
    const { host, root } = mount();
    const { row, fire, body } = swipeRow(host, 2);
    fire("pointerdown", 1, 300);
    fire("pointermove", 1, 220);
    expect(body()).toBe("translateX(-80px)");
    fire("pointerup", 1, 220);
    expect(body()).toBe("");
    expect(row.classList.contains("todo-row-open")).toBe(false);

    fire("pointerdown", 1, 300);
    fire("pointermove", 1, 100);
    fire("pointercancel", 1, 100);
    expect(body()).toBe("");
    expect(ids(host)).toEqual([1, 2, 3, 4]);
    act(() => root.unmount());
  });

  test("a second pointer during a swipe does not leave the row stuck open", () => {
    const { host, root } = mount();
    const { row, fire, body } = swipeRow(host, 2);
    fire("pointerdown", 1, 300);
    fire("pointermove", 1, 250);
    fire("pointerdown", 2, 100);
    fire("pointerup", 2, 100);
    fire("pointerdown", 3, 100, { isPrimary: false });
    fire("pointerup", 3, 100);
    fire("pointerup", 1, 250);
    expect(body()).toBe("");
    expect(row.classList.contains("todo-row-open")).toBe(false);
    expect(row.classList.contains("todo-row-swiping")).toBe(false);
    act(() => root.unmount());
  });

  test("two fast deletes hand focus to a row that stays", async () => {
    const { host, root } = mount({ reduced: false });
    const remove = (id: number) => host.querySelector<HTMLButtonElement>(`[data-todo="${id}"] .todo-delete`);
    remove(4)?.focus();
    act(() => remove(4)?.click());
    expect(document.activeElement).toBe(remove(3));
    act(() => remove(3)?.click());
    expect(document.activeElement).toBe(remove(2));
    await act(() => new Promise((resolve) => setTimeout(resolve, 400)));
    expect(ids(host)).toEqual([1, 2]);
    expect(document.activeElement).toBe(remove(2));
    act(() => root.unmount());
  });
});
