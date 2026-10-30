import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Hero, passed } from "../src/sections/hero";

describe("passed", () => {
  test("sees a mark between two times, round the end of the loop too", () => {
    expect(passed(3700, 3800, 3800)).toBe(true);
    expect(passed(3800, 3900, 3800)).toBe(false);
    expect(passed(3600, 3700, 3800)).toBe(false);
    expect(passed(11900, 300, 250)).toBe(true);
    expect(passed(11900, 200, 250)).toBe(false);
    expect(passed(11900, 300, 11950)).toBe(true);
    expect(passed(11900, 300, 11800)).toBe(false);
  });
});

describe("HeroPhone", () => {
  let frames: FrameRequestCallback[] = [];
  let now = 0;
  let host: HTMLDivElement;
  let root: Root;
  const real = { raf: globalThis.requestAnimationFrame, caf: globalThis.cancelAnimationFrame, now: performance.now, observer: globalThis.IntersectionObserver };

  /** Runs the loop's frames, 100 milliseconds apart, for this long. */
  function run(ms: number) {
    for (let left = ms; left > 0; left -= 100) {
      now += 100;
      const due = frames;
      frames = [];
      act(() => due.forEach((frame) => frame(now)));
    }
  }

  beforeEach(() => {
    frames = [];
    now = 0;
    globalThis.requestAnimationFrame = (frame) => frames.push(frame);
    globalThis.cancelAnimationFrame = () => {};
    performance.now = () => now;
    globalThis.IntersectionObserver = class {
      observe() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => root.render(<Hero />));
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.innerHTML = "";
    globalThis.requestAnimationFrame = real.raf;
    globalThis.cancelAnimationFrame = real.caf;
    performance.now = real.now;
    globalThis.IntersectionObserver = real.observer;
  });

  const demoBox = () => host.querySelector('[data-todo="1"] .todo-check')?.getAttribute("aria-checked");

  test("the loop checks the demo to-do as the clock runs past the tap", () => {
    expect(demoBox()).toBe("false");
    expect(host.querySelector(".todo-left")?.getAttribute("aria-live")).toBe("off");
    run(8000);
    expect(demoBox()).toBe("true");
  });

  test("a touch on the glass stops the loop from changing the list", () => {
    act(() => {
      host.querySelector(".todo-glass")?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, isPrimary: true }));
    });
    run(8000);
    expect(demoBox()).toBe("false");
    expect(host.querySelector(".todo-left")?.getAttribute("aria-live")).toBe("polite");
  });
});
