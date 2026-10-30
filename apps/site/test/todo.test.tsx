import { afterEach, describe, expect, test } from "bun:test";
import { act, useReducer } from "react";
import { createRoot } from "react-dom/client";
import { MAX_LENGTH, START, TodoApp, shownFor, todosReducer } from "../src/sections/todo";

afterEach(() => {
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

function Harness() {
  const [todos, dispatch] = useReducer(todosReducer, START);
  return <TodoApp todos={todos} dispatch={dispatch} reduced />;
}

describe("TodoApp", () => {
  test("adds with the form, checks, deletes and filters", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
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
});
