import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
import { act, useState } from "react";
import { fakeFrames, fire, fireOnWindow, installGlobal, mount, reducedMotion } from "../../../packages/react/test/dom";
import { Keyboard } from "../src";

const frames = fakeFrames();
afterAll(frames.restore);
afterEach(() => document.body.replaceChildren());

// A stand-in for WebAudio that counts the contexts made, the clicks played and the contexts closed.
let made = 0;
let played = 0;
let closed = 0;
const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
const node = () => ({ connect: (next: unknown) => next, start() {}, stop() {}, gain: param(), frequency: param(), Q: param(), buffer: null, type: "" });
class FakeAudio {
  sampleRate = 8000;
  currentTime = 0;
  state = "running";
  destination = {};
  constructor() {
    made += 1;
  }
  createBuffer = (_: number, length: number) => ({ getChannelData: () => new Float32Array(length) });
  createBufferSource = () => {
    played += 1;
    return node();
  };
  createBiquadFilter = node;
  createGain = node;
  createOscillator = node;
  resume = async () => {};
  close = async () => {
    closed += 1;
  };
}
const restoreAudio = installGlobal("AudioContext", FakeAudio);
beforeEach(() => {
  made = 0;
  played = 0;
  closed = 0;
});
afterAll(restoreAudio);

const key = (host: Element, id: string) => host.querySelector(`[data-key="${id}"]`)!;
const isDown = (host: Element, id: string) => key(host, id).hasAttribute("data-down");
/** Sends a key from the page; `at` sets its time and `caps` whether caps lock is on, as happy-dom keeps neither. */
const press = (type: "keydown" | "keyup", code: string, { at, caps, ...init }: KeyboardEventInit & { at?: number; caps?: boolean } = {}) => {
  const event = new KeyboardEvent(type, { bubbles: true, code, ...init });
  if (at !== undefined) Object.defineProperty(event, "timeStamp", { value: at });
  if (caps !== undefined) Object.defineProperty(event, "getModifierState", { value: (name: string) => name === "CapsLock" && caps });
  return fire(document.body, event);
};
const light = (host: Element) => key(host, "CapsLock").querySelector("rect")?.hasAttribute("data-on");

test("a real key holds its cap down by its code until it comes up, and never stops the page's own keys", async () => {
  const { host, unmount } = await mount(<Keyboard />);
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, code: "KeyQ", key: "й" });
  await fire(document.body, event);
  expect(event.defaultPrevented).toBe(false);
  expect(isDown(host, "KeyQ")).toBe(true);
  await press("keydown", "ShiftLeft");
  expect(isDown(host, "ShiftLeft")).toBe(true);
  await frames.advance(300);
  expect(isDown(host, "KeyQ")).toBe(true);
  await press("keyup", "KeyQ");
  expect(isDown(host, "KeyQ")).toBe(false);
  expect(isDown(host, "ShiftLeft")).toBe(true);
  expect(document.activeElement).toBe(document.body);
  await unmount();
});

const SCROLL_KEYS = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
/** Sends a cancelable key down for each of Space and the arrows from `target`, and returns whether each was default-prevented. */
const scrollKeys = async (target: Element = document.body, init: KeyboardEventInit = {}) => {
  const prevented: boolean[] = [];
  for (const code of SCROLL_KEYS) {
    const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, code, key: code === "Space" ? " " : code, ...init });
    await fire(target, event);
    prevented.push(event.defaultPrevented);
    await fire(target, new KeyboardEvent("keyup", { bubbles: true, code }));
  }
  return prevented;
};

test("Space and the arrows do not scroll the page while focus is on no control, and still press their keys", async () => {
  const { host, unmount } = await mount(<Keyboard />);
  expect(await scrollKeys()).toEqual([true, true, true, true, true]);
  expect(await scrollKeys(document.body, { shiftKey: true })).toEqual([true, true, true, true, true]);
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, code: "Space", key: " " });
  await fire(document.body, event);
  expect(isDown(host, "Space")).toBe(true);
  // Other keys, Tab and the browser's shortcuts on the arrows keep their defaults.
  for (const init of [{ code: "KeyA", key: "a" }, { code: "Tab", key: "Tab" }, { code: "Enter", key: "Enter" }, { code: "PageDown", key: "PageDown" }]) {
    const other = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
    await fire(document.body, other);
    expect(other.defaultPrevented).toBe(false);
  }
  expect(await scrollKeys(document.body, { metaKey: true })).toEqual([false, false, false, false, false]);
  expect(await scrollKeys(document.body, { altKey: true })).toEqual([false, false, false, false, false]);
  await unmount();
});

test("Space and the arrows keep their defaults in another control, on the toy's own button, with listen={false}, and in the text box", async () => {
  const { host, unmount } = await mount(<Keyboard typing />);
  const other = document.createElement("input");
  document.body.append(other);
  other.focus();
  expect(await scrollKeys(other)).toEqual([false, false, false, false, false]);
  other.remove();
  const sound = host.querySelector<HTMLButtonElement>('[role="switch"]')!;
  sound.focus();
  expect(await scrollKeys(sound)).toEqual([false, false, false, false, false]);
  sound.blur();
  // A space typed while nothing has focus goes to the text box, so it must still type there.
  expect(await scrollKeys()).toEqual([false, false, false, false, false]);
  expect(document.activeElement).toBe(host.querySelector("textarea"));
  await unmount();
  const quiet = await mount(<Keyboard listen={false} />);
  expect(await scrollKeys()).toEqual([false, false, false, false, false]);
  await quiet.unmount();
});

test("leaving the window lets every held key go", async () => {
  const { host, unmount } = await mount(<Keyboard />);
  await press("keydown", "KeyA");
  await press("keydown", "MetaLeft");
  await fire(key(host, "KeyL"), new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 3 }));
  expect(host.querySelectorAll("[data-down]")).toHaveLength(3);
  await fireOnWindow(new Event("blur"));
  expect(host.querySelectorAll("[data-down]")).toHaveLength(0);
  await unmount();
});

test("a pointer presses a key until it lifts or leaves", async () => {
  const { host, unmount } = await mount(<Keyboard />);
  await fire(key(host, "Space"), new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 1 }));
  expect(isDown(host, "Space")).toBe(true);
  await fire(key(host, "Space"), new PointerEvent("pointerup", { bubbles: true, pointerId: 1 }));
  expect(isDown(host, "Space")).toBe(false);
  await fire(key(host, "KeyF"), new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 1 }));
  // React makes pointer leave from pointer out, as browsers send both.
  await fire(key(host, "KeyF").querySelector("path")!, new PointerEvent("pointerout", { bubbles: true, pointerId: 1, relatedTarget: host }));
  expect(isDown(host, "KeyF")).toBe(false);
  await unmount();
});

test("no audio starts before a press, and each press and release clicks once", async () => {
  const { unmount } = await mount(<Keyboard />);
  await frames.advance(200);
  expect(made).toBe(0);
  await press("keydown", "KeyS");
  expect(made).toBe(1);
  expect(played).toBe(1);
  await press("keydown", "KeyS", { repeat: true });
  expect(played).toBe(1);
  await press("keyup", "KeyS");
  expect(played).toBe(2);
  await press("keydown", "KeyD");
  expect(made).toBe(1);
  await unmount();
});

test("the sound button turns the clicks off and on, and tells the page", async () => {
  const onSoundChange = mock((_: boolean) => {});
  const { host, unmount } = await mount(<Keyboard onSoundChange={onSoundChange} />);
  const button = host.querySelector('[role="switch"]')!;
  await fire(button, new MouseEvent("click", { bubbles: true }));
  expect(button.getAttribute("aria-checked")).toBe("false");
  expect(button.textContent).toBe("Sound off");
  expect(onSoundChange).toHaveBeenLastCalledWith(false);
  await press("keydown", "KeyK");
  await press("keyup", "KeyK");
  expect(made).toBe(0);
  expect(played).toBe(0);
  await fire(button, new MouseEvent("click", { bubbles: true }));
  expect(onSoundChange).toHaveBeenLastCalledWith(true);
  await press("keydown", "KeyK");
  expect(played).toBe(1);
  await unmount();
});

test("a controlled sound follows its prop, not its button", async () => {
  const onSoundChange = mock((_: boolean) => {});
  const { host, unmount } = await mount(<Keyboard sound={false} onSoundChange={onSoundChange} />);
  const button = host.querySelector('[role="switch"]')!;
  await fire(button, new MouseEvent("click", { bubbles: true }));
  expect(onSoundChange).toHaveBeenCalledWith(true);
  expect(button.getAttribute("aria-checked")).toBe("false");
  await unmount();
});

test("the demo types silently and stops for good at the first real press", async () => {
  const { host, unmount } = await mount(<Keyboard demo="hi" />);
  const seen = new Set<string>();
  for (let step = 0; step < 100; step++) {
    await frames.advance(16);
    for (const down of host.querySelectorAll("[data-down]")) seen.add(down.getAttribute("data-key")!);
  }
  expect([...seen].sort()).toEqual(["KeyH", "KeyI"]);
  expect(made).toBe(0);
  await press("keydown", "KeyZ");
  await press("keyup", "KeyZ");
  await frames.advance(6000);
  expect(host.querySelectorAll("[data-down]")).toHaveLength(0);
  await unmount();
});

test("under reduced motion there is no demo, and keys still go down", async () => {
  const motion = reducedMotion(true);
  const { host, unmount } = await mount(<Keyboard demo />);
  await frames.advance(2000);
  expect(host.querySelectorAll("[data-down]")).toHaveLength(0);
  await press("keydown", "KeyE");
  expect(isDown(host, "KeyE")).toBe(true);
  await unmount();
  motion.restore();
});

test("listen={false} leaves the real keyboard alone", async () => {
  const { host, unmount } = await mount(<Keyboard listen={false} />);
  await press("keydown", "KeyQ");
  expect(isDown(host, "KeyQ")).toBe(false);
  expect(made).toBe(0);
  await unmount();
});

test("keys pressed while command is down spring back by themselves", async () => {
  const { host, unmount } = await mount(<Keyboard />);
  await press("keydown", "MetaLeft", { metaKey: true });
  await press("keydown", "KeyK", { metaKey: true });
  expect(isDown(host, "KeyK")).toBe(true);
  await wait(200);
  expect(isDown(host, "KeyK")).toBe(false);
  expect(isDown(host, "MetaLeft")).toBe(true);
  await unmount();
});

/** Waits real time, for the timers a tap uses, and lets React finish what they start. */
const wait = (ms: number) => act(() => new Promise<void>((done) => setTimeout(done, ms)));

test("caps lock taps on a key down with no key up, and on a lone key up", async () => {
  const { host, unmount } = await mount(<Keyboard />);
  await press("keydown", "CapsLock", { at: 1000 });
  expect(isDown(host, "CapsLock")).toBe(true);
  await wait(200);
  expect(isDown(host, "CapsLock")).toBe(false);
  await press("keyup", "CapsLock", { at: 5000 });
  expect(isDown(host, "CapsLock")).toBe(true);
  await wait(200);
  expect(isDown(host, "CapsLock")).toBe(false);
  await unmount();
});

test("caps lock comes up at once on a quick key up, and taps again only after 600 ms", async () => {
  const { host, unmount } = await mount(<Keyboard />);
  await press("keydown", "CapsLock", { at: 1000 });
  await press("keyup", "CapsLock", { at: 1050 });
  expect(isDown(host, "CapsLock")).toBe(false);
  await press("keydown", "CapsLock", { at: 2000 });
  await wait(200);
  await press("keyup", "CapsLock", { at: 2500 });
  expect(isDown(host, "CapsLock")).toBe(false);
  await press("keydown", "CapsLock", { at: 3000 });
  await wait(200);
  await press("keyup", "CapsLock", { at: 3700 });
  expect(isDown(host, "CapsLock")).toBe(true);
  await wait(200);
  expect(isDown(host, "CapsLock")).toBe(false);
  await unmount();
});

test("with no text box, a clicked shift does not stay down and a clicked caps lock leaves the light alone", async () => {
  const { host, unmount } = await mount(<Keyboard />);
  const click = async (id: string) => {
    await fire(key(host, id), new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 1, pointerType: "mouse" }));
    await fire(key(host, id), new PointerEvent("pointerup", { bubbles: true, pointerId: 1, pointerType: "mouse" }));
  };
  await click("ShiftLeft");
  expect(isDown(host, "ShiftLeft")).toBe(false);
  await click("KeyA");
  expect(isDown(host, "ShiftLeft")).toBe(false);
  await click("CapsLock");
  expect(light(host)).toBe(false);
  await unmount();
});

test("the caps lock light follows the system's caps lock", async () => {
  const { host, unmount } = await mount(<Keyboard />);
  expect(light(host)).toBe(false);
  await press("keydown", "KeyA", { caps: true });
  expect(light(host)).toBe(true);
  await press("keyup", "KeyA", { caps: true });
  expect(light(host)).toBe(true);
  await press("keydown", "CapsLock", { at: 1000, caps: false });
  expect(light(host)).toBe(false);
  await unmount();
});

test("command coming up lets every held key go", async () => {
  const { host, unmount } = await mount(<Keyboard />);
  await press("keydown", "KeyA");
  await press("keydown", "MetaLeft", { metaKey: true });
  expect(isDown(host, "KeyA")).toBe(true);
  await press("keyup", "MetaLeft");
  expect(isDown(host, "KeyA")).toBe(false);
  expect(isDown(host, "MetaLeft")).toBe(false);
  await unmount();
});

test("a hidden page lets every held key go", async () => {
  const { host, unmount } = await mount(<Keyboard />);
  await press("keydown", "KeyA");
  expect(isDown(host, "KeyA")).toBe(true);
  Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
  await act(async () => void document.dispatchEvent(new Event("visibilitychange")));
  Reflect.deleteProperty(document, "visibilityState");
  expect(isDown(host, "KeyA")).toBe(false);
  await unmount();
});

test("a page that stops a key still lets its cap come up", async () => {
  const { host, unmount } = await mount(<Keyboard />);
  const stop = (event: Event) => event.stopPropagation();
  document.body.addEventListener("keyup", stop);
  await press("keydown", "KeyA");
  await press("keyup", "KeyA");
  document.body.removeEventListener("keyup", stop);
  expect(isDown(host, "KeyA")).toBe(false);
  await unmount();
});

test("unmounting closes the audio once a press started it", async () => {
  const { unmount } = await mount(<Keyboard />);
  await press("keydown", "KeyS");
  expect(made).toBe(1);
  await unmount();
  expect(closed).toBe(1);
});

/** Puts a stand-in IntersectionObserver in place until `restore`; `view` tells every observed board whether it is on screen. */
function fakeObserver() {
  const instances: FakeObserver[] = [];
  class FakeObserver implements IntersectionObserver {
    root = null;
    rootMargin = "";
    scrollMargin = "";
    thresholds = [0];
    takeRecords = () => [];
    callback: IntersectionObserverCallback;
    target?: Element;
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
      instances.push(this);
    }
    observe(target: Element) {
      this.target = target;
    }
    disconnect() {}
    unobserve() {}
  }
  const restore = installGlobal("IntersectionObserver", FakeObserver);
  const view = (isIntersecting: boolean) =>
    act(async () => {
      for (const observer of instances) {
        const { callback, target } = observer;
        if (!target) continue;
        const rect = target.getBoundingClientRect();
        callback(
          [{ boundingClientRect: rect, intersectionRect: rect, rootBounds: null, intersectionRatio: isIntersecting ? 1 : 0, time: 0, isIntersecting, target }],
          observer,
        );
      }
    });
  return { view, restore };
}

test("the real keyboard moves the keys only while the board is on screen", async () => {
  const { view, restore } = fakeObserver();
  try {
    const { host, unmount } = await mount(<Keyboard />);
    await view(false);
    await press("keydown", "KeyQ");
    expect(isDown(host, "KeyQ")).toBe(false);
    expect(made).toBe(0);
    await view(true);
    await press("keydown", "KeyQ");
    expect(isDown(host, "KeyQ")).toBe(true);
    expect(made).toBe(1);
    await view(false);
    expect(isDown(host, "KeyQ")).toBe(false);
    await unmount();
  } finally {
    restore();
  }
});

test("off screen, Space and the arrows scroll the page as usual", async () => {
  const { view, restore } = fakeObserver();
  try {
    const { unmount } = await mount(<Keyboard />);
    await view(false);
    expect(await scrollKeys()).toEqual([false, false, false, false, false]);
    await view(true);
    expect(await scrollKeys()).toEqual([true, true, true, true, true]);
    await unmount();
  } finally {
    restore();
  }
});

test("the demo rests while the board is off screen, and types again when it shows", async () => {
  const { view, restore } = fakeObserver();
  try {
    const { host, unmount } = await mount(<Keyboard demo="hi" />);
    await view(false);
    // Let the caps' springs settle; then nothing asks for frames.
    await frames.advance(1500);
    expect(frames.pending()).toBe(0);
    expect(host.querySelectorAll("[data-down]")).toHaveLength(0);
    await view(true);
    const seen = new Set<string>();
    for (let step = 0; step < 100; step++) {
      await frames.advance(16);
      for (const down of host.querySelectorAll("[data-down]")) seen.add(down.getAttribute("data-key") ?? "");
    }
    expect([...seen].sort()).toEqual(["KeyH", "KeyI"]);
    await unmount();
  } finally {
    restore();
  }
});

test("with listen={false} a key held by a pointer still comes up when the window loses focus", async () => {
  const { host, unmount } = await mount(<Keyboard listen={false} />);
  await fire(key(host, "KeyL"), new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 4 }));
  expect(isDown(host, "KeyL")).toBe(true);
  await fireOnWindow(new Event("blur"));
  expect(isDown(host, "KeyL")).toBe(false);
  await unmount();
});

const box = (host: Element) => host.querySelector("textarea")!;
const buttonNamed = (host: Element, name: string) => [...host.querySelectorAll("button")].find((button) => (button.getAttribute("aria-label") ?? button.textContent) === name);
/**
 * Puts `text` in a text box as typing would. Depending on what React found when it loaded,
 * it reads the change on input or on key up, so both are sent; it acts on the first only.
 */
const typeInto = (field: HTMLTextAreaElement, text: string) =>
  act(async () => {
    field.focus();
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(field, text);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
  });

test("a key typed while nothing has focus focuses the text box before the browser types it, and still presses", async () => {
  const { host, unmount } = await mount(<Keyboard typing defaultValue="Hi" />);
  expect(document.activeElement).toBe(document.body);
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, code: "KeyH", key: "h" });
  await fire(document.body, event);
  expect(event.defaultPrevented).toBe(false);
  expect(document.activeElement).toBe(box(host));
  expect([box(host).selectionStart, box(host).selectionEnd]).toEqual([2, 2]);
  expect(isDown(host, "KeyH")).toBe(true);
  expect(made).toBe(1);
  await unmount();
});

test("an AltGr character, sent as ctrl and alt on Windows, goes into the text box", async () => {
  const { host, unmount } = await mount(<Keyboard typing />);
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, code: "KeyQ", key: "@", ctrlKey: true, altKey: true });
  Object.defineProperty(event, "getModifierState", { value: (name: string) => name === "AltGraph" });
  await fire(document.body, event);
  expect(document.activeElement).toBe(box(host));
  await unmount();
});

test("a dead key pressed while nothing has focus focuses the text box, so the accent it starts lands there", async () => {
  const { host, unmount } = await mount(<Keyboard typing />);
  await press("keydown", "Quote", { key: "Dead", metaKey: true });
  expect(document.activeElement).toBe(document.body);
  await press("keydown", "Quote", { key: "Dead" });
  expect(document.activeElement).toBe(box(host));
  await unmount();
});

test("shortcuts, tab and a space on the toy's own button stay where they are", async () => {
  const { host, unmount } = await mount(<Keyboard typing fullscreen />);
  await press("keydown", "KeyL", { key: "l", metaKey: true });
  await press("keydown", "KeyT", { key: "t", ctrlKey: true });
  await press("keydown", "Tab", { key: "Tab" });
  expect(document.activeElement).toBe(document.body);
  const sound = host.querySelector<HTMLButtonElement>('[role="switch"]')!;
  sound.focus();
  await fire(sound, new KeyboardEvent("keydown", { bubbles: true, code: "Space", key: " " }));
  expect(document.activeElement).toBe(sound);
  await fire(sound, new KeyboardEvent("keydown", { bubbles: true, code: "KeyA", key: "a" }));
  expect(document.activeElement).toBe(box(host));
  await unmount();
});

test("typing in another field on the page stays in that field and presses nothing", async () => {
  const { host, unmount } = await mount(<Keyboard typing />);
  const other = document.createElement("input");
  document.body.append(other);
  other.focus();
  await fire(other, new KeyboardEvent("keydown", { bubbles: true, code: "KeyX", key: "x" }));
  expect(document.activeElement).toBe(other);
  expect(isDown(host, "KeyX")).toBe(false);
  expect(made).toBe(0);
  other.remove();
  await unmount();
});

test("Enter or Space on another button on the page presses no key and starts no audio", async () => {
  const { host, unmount } = await mount(<Keyboard typing />);
  const other = document.createElement("button");
  document.body.append(other);
  other.focus();
  for (const { code, key } of [
    { code: "Enter", key: "Enter" },
    { code: "Space", key: " " },
  ]) {
    await fire(other, new KeyboardEvent("keydown", { bubbles: true, code, key }));
    expect(host.querySelectorAll("[data-down]")).toHaveLength(0);
    await fire(other, new KeyboardEvent("keyup", { bubbles: true, code, key }));
  }
  expect(document.activeElement).toBe(other);
  expect(made).toBe(0);
  expect(played).toBe(0);
  other.remove();
  await unmount();
});

test("a key that went down with no focus comes up after focus moves to another control", async () => {
  const { host, unmount } = await mount(<Keyboard />);
  await press("keydown", "KeyA");
  expect(isDown(host, "KeyA")).toBe(true);
  const other = document.createElement("input");
  document.body.append(other);
  other.focus();
  await fire(other, new KeyboardEvent("keyup", { bubbles: true, code: "KeyA" }));
  expect(isDown(host, "KeyA")).toBe(false);
  other.remove();
  await unmount();
});

test("keys on the keyboard's own focused buttons still press", async () => {
  const { host, unmount } = await mount(<Keyboard />);
  const sound = host.querySelector<HTMLButtonElement>('[role="switch"]')!;
  sound.focus();
  await fire(sound, new KeyboardEvent("keydown", { bubbles: true, code: "Enter", key: "Enter" }));
  expect(isDown(host, "Enter")).toBe(true);
  await unmount();
});

test("the text box keeps what is typed, tells the page, and Clear empties it and keeps the focus there", async () => {
  const onValueChange = mock((_: string) => {});
  const { host, unmount } = await mount(<Keyboard typing onValueChange={onValueChange} />);
  await typeInto(box(host), "Hello world");
  expect(box(host).value).toBe("Hello world");
  expect(onValueChange).toHaveBeenLastCalledWith("Hello world");
  await fire(buttonNamed(host, "Clear")!, new MouseEvent("click", { bubbles: true }));
  expect(box(host).value).toBe("");
  expect(onValueChange).toHaveBeenLastCalledWith("");
  expect(document.activeElement).toBe(box(host));
  await unmount();
});

test("a controlled text follows its prop, not the box", async () => {
  const onValueChange = mock((_: string) => {});
  const { host, rerender, unmount } = await mount(<Keyboard typing value="fixed" onValueChange={onValueChange} />);
  await typeInto(box(host), "fixedx");
  expect(onValueChange).toHaveBeenLastCalledWith("fixedx");
  expect(box(host).value).toBe("fixed");
  await rerender(<Keyboard typing value="next" onValueChange={onValueChange} />);
  expect(box(host).value).toBe("next");
  await unmount();
});

test("the text box brings no audio before a gesture, and listen={false} with typing still focuses the box but presses nothing", async () => {
  const { host, unmount } = await mount(<Keyboard typing listen={false} />);
  await frames.advance(200);
  expect(made).toBe(0);
  await press("keydown", "KeyQ", { key: "q" });
  expect(document.activeElement).toBe(box(host));
  expect(isDown(host, "KeyQ")).toBe(false);
  expect(made).toBe(0);
  await unmount();
});

test("the full screen button fills the screen with the turntable, follows full screen changes, and shows the text box there", async () => {
  const off = await mount(<Keyboard fullscreen={false} />);
  expect(off.host.querySelectorAll("button")).toHaveLength(1);
  await off.unmount();

  const screen: { filled: Element | null } = { filled: null };
  const change = () => document.dispatchEvent(new Event("fullscreenchange"));
  const requestFullscreen = mock(async function (this: Element) {
    screen.filled = this;
    change();
  });
  const exitFullscreen = mock(async () => {
    screen.filled = null;
    change();
  });
  Object.defineProperty(HTMLElement.prototype, "requestFullscreen", { value: requestFullscreen, configurable: true });
  Object.defineProperty(document, "exitFullscreen", { value: exitFullscreen, configurable: true });
  Object.defineProperty(document, "fullscreenElement", { get: () => screen.filled, configurable: true });
  try {
    const { host, unmount } = await mount(<Keyboard typing />);
    const turntable = host.querySelector(".vectoys-turntable")!;
    expect([...host.querySelectorAll("button, textarea")].map((element) => element.getAttribute("aria-label") ?? (element.textContent || element.tagName))).toEqual([
      "Typed text",
      "Clear",
      "Sound on",
      "Full screen Keyboard",
    ]);
    await act(async () => buttonNamed(host, "Full screen Keyboard")!.click());
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    expect(screen.filled).toBe(turntable);
    expect(buttonNamed(host, "Exit full screen")).toBeDefined();
    await act(async () => buttonNamed(host, "Exit full screen")!.click());
    expect(exitFullscreen).toHaveBeenCalledTimes(1);
    expect(buttonNamed(host, "Full screen Keyboard")).toBeDefined();
    // Esc is the browser's: it leaves full screen and sends only the change.
    await act(async () => turntable instanceof HTMLElement && turntable.requestFullscreen());
    expect(buttonNamed(host, "Exit full screen")).toBeDefined();
    screen.filled = null;
    await act(async () => change());
    expect(buttonNamed(host, "Full screen Keyboard")).toBeDefined();
    await unmount();

    // As the site's typing section has it.
    const only = await mount(<Keyboard demo typing="fullscreen" fullscreen />);
    expect(only.host.querySelector("textarea")).toBeNull();
    await press("keydown", "KeyH", { key: "h" });
    expect(document.activeElement).toBe(document.body);
    await act(async () => buttonNamed(only.host, "Full screen Keyboard")!.click());
    expect(box(only.host)).not.toBeNull();
    expect(box(only.host).placeholder).toBe("Start typing\u2026");
    await press("keydown", "KeyH", { key: "h" });
    expect(document.activeElement).toBe(box(only.host));
    expect([...only.host.querySelectorAll("button")].map((element) => element.getAttribute("aria-label") ?? element.textContent)).toEqual(["Clear", "Sound on", "Exit full screen"]);
    await act(async () => buttonNamed(only.host, "Exit full screen")!.click());
    expect(only.host.querySelector("textarea")).toBeNull();
    await only.unmount();

    // The page takes the button away while the toy fills the screen: it leaves full screen and lays out as before.
    const dropped = await mount(<Keyboard typing="fullscreen" />);
    await act(async () => buttonNamed(dropped.host, "Full screen Keyboard")?.click());
    expect(box(dropped.host)).not.toBeNull();
    const exits = exitFullscreen.mock.calls.length;
    await dropped.rerender(<Keyboard typing="fullscreen" fullscreen={false} />);
    expect(exitFullscreen).toHaveBeenCalledTimes(exits + 1);
    expect(screen.filled).toBeNull();
    expect(dropped.host.querySelector("textarea")).toBeNull();
    expect(dropped.host.querySelector('[role="group"]')?.getAttribute("style")).not.toContain("position: relative");
    await dropped.unmount();

    // A shift clicked in full screen lets go on the way out and does not shift the next key clicked.
    const latch = await mount(<Keyboard typing="fullscreen" />);
    await act(async () => buttonNamed(latch.host, "Full screen Keyboard")!.click());
    await click(latch.host, "ShiftLeft");
    expect(isDown(latch.host, "ShiftLeft")).toBe(true);
    await act(async () => buttonNamed(latch.host, "Exit full screen")!.click());
    expect(isDown(latch.host, "ShiftLeft")).toBe(false);
    await act(async () => buttonNamed(latch.host, "Full screen Keyboard")!.click());
    expect(isDown(latch.host, "ShiftLeft")).toBe(false);
    await click(latch.host, "KeyH");
    expect(box(latch.host).value).toBe("h");
    await latch.unmount();
  } finally {
    Reflect.deleteProperty(HTMLElement.prototype, "requestFullscreen");
    Reflect.deleteProperty(document, "exitFullscreen");
    Reflect.deleteProperty(document, "fullscreenElement");
  }
});

const pointer = (type: string, x: number) => new PointerEvent(type, { clientX: x, clientY: 0, pointerId: 7, pointerType: "mouse", button: 0, buttons: 1, bubbles: true });

test("a drag from a key never turns the eye and keeps the key down, and a drag from the case turns it", async () => {
  const { host, unmount } = await mount(<Keyboard />);
  const body = host.querySelector<HTMLElement>(".vectoys-turntable-body")!;
  const faces = () => key(host, "KeyJ").querySelector("path")?.getAttribute("d");
  const before = faces();
  await fire(key(host, "KeyJ"), pointer("pointerdown", 0));
  expect(isDown(host, "KeyJ")).toBe(true);
  await fire(key(host, "KeyJ"), pointer("pointermove", 60));
  expect(isDown(host, "KeyJ")).toBe(true);
  expect(faces()).toBe(before);
  await fire(key(host, "KeyJ"), pointer("pointerup", 60));
  expect(isDown(host, "KeyJ")).toBe(false);
  await frames.advance(400);
  expect(faces()).toBe(before);
  const caseFace = host.querySelector("svg")!.querySelector(":scope path")!;
  expect(caseFace.closest("[data-key]")).toBeNull();
  await fire(caseFace, pointer("pointerdown", 0));
  await fire(caseFace, pointer("pointermove", 60));
  expect(faces()).not.toBe(before);
  expect(body.style.transform).toBe("");
  await fire(caseFace, pointer("pointerup", 60));
  await frames.advance(400);
  await unmount();
});

test("keys typed while the turntable round the keyboard has focus still press, and type into the box", async () => {
  const { host, unmount } = await mount(<Keyboard typing />);
  const turntable = host.querySelector<HTMLElement>(".vectoys-turntable")!;
  turntable.focus();
  await press("keydown", "KeyA", { key: "a" });
  expect(isDown(host, "KeyA")).toBe(true);
  expect(document.activeElement).toBe(box(host));
  await press("keyup", "KeyA", { key: "a" });
  await unmount();
});

test("with dragging off a pointer that moves still keeps its key down", async () => {
  const { host, unmount } = await mount(<Keyboard draggable={false} fullscreen={false} />);
  expect(host.querySelector(".vectoys-turntable")?.hasAttribute("tabindex")).toBe(false);
  expect(host.querySelectorAll("button")).toHaveLength(1);
  await fire(key(host, "KeyJ"), pointer("pointerdown", 0));
  await fire(key(host, "KeyJ"), pointer("pointermove", 60));
  expect(isDown(host, "KeyJ")).toBe(true);
  await fire(key(host, "KeyJ"), pointer("pointerup", 60));
  await unmount();
});

test("keys still type after the full screen button is clicked, as the browser leaves focus on it", async () => {
  const { host, unmount } = await mount(<Keyboard typing />);
  const button = buttonNamed(host, "Full screen Keyboard")!;
  button.focus();
  await act(async () => button.click());
  expect(document.activeElement).toBe(button);
  await press("keydown", "KeyH", { key: "h" });
  expect(isDown(host, "KeyH")).toBe(true);
  expect(document.activeElement).toBe(box(host));
  await press("keyup", "KeyH", { key: "h" });
  await fire(document.body, new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await unmount();
});

test("the text row leaves room for the full screen button, so it never covers Clear", async () => {
  const row = async (fullscreen: boolean) => {
    const { host, unmount } = await mount(<Keyboard typing fullscreen={fullscreen} />);
    const padding = box(host).parentElement!.style.paddingRight;
    await unmount();
    return padding;
  };
  expect(await row(true)).toBe("40px");
  expect(await row(false)).toBe("");
});

/** Clicks key `id` with a mouse, or a finger with `touch`, holding shift with `shiftKey`. */
const click = async (host: Element, id: string, { touch = false, shiftKey = false } = {}) => {
  const init = { bubbles: true, cancelable: true, button: 0, buttons: 1, pointerId: 9, pointerType: touch ? "touch" : "mouse", shiftKey };
  await fire(key(host, id), new PointerEvent("pointerdown", init));
  await fire(key(host, id), new PointerEvent("pointerup", { ...init, buttons: 0 }));
};
const clickAll = async (host: Element, ids: string[]) => {
  for (const id of ids) await click(host, id);
};

test("a key clicked on the board presses it and types its character into the box, at the press, once", async () => {
  const onValueChange = mock((_: string) => {});
  const { host, unmount } = await mount(<Keyboard typing onValueChange={onValueChange} />);
  const event = new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0, pointerId: 9, pointerType: "mouse" });
  await fire(key(host, "KeyH"), event);
  expect(event.defaultPrevented).toBe(true);
  expect(isDown(host, "KeyH")).toBe(true);
  expect(box(host).value).toBe("h");
  expect(onValueChange).toHaveBeenLastCalledWith("h");
  expect(made).toBe(1);
  expect(played).toBe(1);
  // Sliding off lets it up, and coming up types nothing more.
  await fire(key(host, "KeyH").querySelector("path")!, new PointerEvent("pointerout", { bubbles: true, pointerId: 9, relatedTarget: host }));
  expect(isDown(host, "KeyH")).toBe(false);
  await fire(key(host, "KeyH"), new PointerEvent("pointerup", { bubbles: true, pointerId: 9 }));
  expect(box(host).value).toBe("h");
  expect(played).toBe(2);
  await clickAll(host, ["KeyI", "Digit2", "Slash", "Space", "Quote"]);
  expect(box(host).value).toBe("hi2/ '");
  // A mouse leaves the caret in the box.
  expect(document.activeElement).toBe(box(host));
  await unmount();
});

test("a clicked shift stays down for the next key only, and a shift held on the real keyboard shifts a click too", async () => {
  const { host, unmount } = await mount(<Keyboard typing />);
  await click(host, "ShiftLeft");
  expect(isDown(host, "ShiftLeft")).toBe(true);
  await clickAll(host, ["KeyH", "KeyI"]);
  expect(isDown(host, "ShiftLeft")).toBe(false);
  await click(host, "ShiftRight");
  await click(host, "Digit1");
  expect(box(host).value).toBe("Hi!");
  // A second click lets it up unused.
  await click(host, "ShiftLeft");
  await click(host, "ShiftLeft");
  expect(isDown(host, "ShiftLeft")).toBe(false);
  await click(host, "Digit1");
  // Control and the other modifiers keep it down.
  await click(host, "ShiftLeft");
  await click(host, "ControlLeft");
  expect(isDown(host, "ShiftLeft")).toBe(true);
  await click(host, "Equal");
  await click(host, "KeyA", { shiftKey: true });
  expect(box(host).value).toBe("Hi!1+A");
  // A key typed on the real keyboard lets a clicked shift up.
  await click(host, "ShiftLeft");
  await press("keydown", "KeyB", { key: "b" });
  await press("keyup", "KeyB", { key: "b" });
  expect(isDown(host, "ShiftLeft")).toBe(false);
  await unmount();
});

test("a clicked caps lock turns its light on and off, and shifts the letters only, the other way while shift is down", async () => {
  const { host, unmount } = await mount(<Keyboard typing />);
  await click(host, "CapsLock");
  expect(light(host)).toBe(true);
  await clickAll(host, ["KeyO", "KeyK", "Digit1"]);
  await click(host, "KeyA", { shiftKey: true });
  await click(host, "CapsLock");
  expect(light(host)).toBe(false);
  await click(host, "KeyO");
  expect(box(host).value).toBe("OK1ao");
  await unmount();
});

test("clicked delete, return, the arrows and the keys that type nothing act at the caret", async () => {
  const { host, unmount } = await mount(<Keyboard typing defaultValue="abcd" />);
  // Without focus on the box, as the real keyboard does, a click types at the end.
  await click(host, "Backspace");
  expect(box(host).value).toBe("abc");
  box(host).setSelectionRange(1, 1);
  await click(host, "Enter");
  expect(box(host).value).toBe("a\nbc");
  expect([box(host).selectionStart, box(host).selectionEnd]).toEqual([2, 2]);
  await click(host, "ArrowRight");
  await click(host, "Backspace");
  expect(box(host).value).toBe("a\nc");
  await click(host, "ArrowLeft");
  await click(host, "KeyX");
  expect(box(host).value).toBe("ax\nc");
  box(host).setSelectionRange(0, 3);
  await click(host, "Backspace");
  expect(box(host).value).toBe("c");
  await clickAll(host, ["Tab", "Escape", "F5", "MetaLeft", "AltLeft", "Fn", "ArrowUp"]);
  expect(box(host).value).toBe("c");
  await unmount();
});

test("a click deletes a character outside the basic plane whole", async () => {
  const { host, unmount } = await mount(<Keyboard typing defaultValue={"a\u{1F600}"} />);
  await click(host, "Backspace");
  expect(box(host).value).toBe("a");
  await unmount();
});

test("clicked arrows step over a character outside the basic plane whole", async () => {
  const { host, unmount } = await mount(<Keyboard typing defaultValue={"a\u{1F600}b"} />);
  box(host).focus();
  box(host).setSelectionRange(3, 3);
  await click(host, "ArrowLeft");
  expect(box(host).selectionStart).toBe(1);
  await click(host, "ArrowRight");
  expect(box(host).selectionStart).toBe(3);
  await click(host, "ArrowLeft");
  await click(host, "KeyX");
  expect(box(host).value).toBe("ax\u{1F600}b");
  await unmount();
});

/** A page that keeps the text and takes no more than five characters. */
function Limited() {
  const [value, setValue] = useState("abcde");
  return <Keyboard typing value={value} onValueChange={(next) => next.length <= 5 && setValue(next)} />;
}

test("a click the page refuses leaves no caret behind to move a later change", async () => {
  const { host, unmount } = await mount(<Limited />);
  await click(host, "KeyX");
  expect(box(host).value).toBe("abcde");
  // A later edit in the box, which the page takes, keeps its own caret.
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(box(host), "acde");
    box(host).setSelectionRange(1, 1);
    box(host).dispatchEvent(new Event("input", { bubbles: true }));
    box(host).dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
  });
  expect(box(host).value).toBe("acde");
  expect(box(host).selectionStart).toBe(1);
  await unmount();
});

test("a click on a controlled box tells the page and leaves the text to its prop", async () => {
  const onValueChange = mock((_: string) => {});
  const { host, unmount } = await mount(<Keyboard typing value="fixed" onValueChange={onValueChange} />);
  await click(host, "KeyX");
  expect(onValueChange).toHaveBeenLastCalledWith("fixedx");
  expect(box(host).value).toBe("fixed");
  await click(host, "Backspace");
  expect(onValueChange).toHaveBeenLastCalledWith("fixe");
  await unmount();
});

test("a tap types without focusing the box, so the phone's own keyboard stays closed, and focus elsewhere stays there", async () => {
  const { host, unmount } = await mount(<Keyboard typing />);
  await click(host, "KeyQ", { touch: true });
  expect(box(host).value).toBe("q");
  expect(document.activeElement).toBe(document.body);
  const other = document.createElement("input");
  document.body.append(other);
  other.focus();
  await click(host, "KeyW", { touch: true });
  expect(box(host).value).toBe("qw");
  expect(document.activeElement).toBe(other);
  other.remove();
  await unmount();
});

test("a finger or pen presses a key at once and types it as it lifts, but not when the press was cancelled, moved or left the key", async () => {
  const { host, unmount } = await mount(<Keyboard typing />);
  const touch = (type: string, id: string, x = 0, pointerType = "touch") =>
    fire(key(host, id), new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, pointerId: 5, pointerType, clientX: x, clientY: 0 }));
  await touch("pointerdown", "KeyA");
  expect(isDown(host, "KeyA")).toBe(true);
  expect(box(host).value).toBe("");
  await touch("pointermove", "KeyA", 2);
  await touch("pointerup", "KeyA", 2);
  expect(isDown(host, "KeyA")).toBe(false);
  expect(box(host).value).toBe("a");
  // The browser took the touch to scroll the page.
  await touch("pointerdown", "KeyB");
  await touch("pointercancel", "KeyB");
  expect(isDown(host, "KeyB")).toBe(false);
  // A finger that moves is scrolling or sliding off.
  await touch("pointerdown", "KeyC");
  await touch("pointermove", "KeyC", 30);
  expect(isDown(host, "KeyC")).toBe(true);
  await touch("pointerup", "KeyC", 30);
  // A finger that left the key, then lifts on it again.
  await touch("pointerdown", "KeyD");
  await fire(key(host, "KeyD").querySelector("path")!, new PointerEvent("pointerout", { bubbles: true, pointerId: 5, relatedTarget: host }));
  await touch("pointerup", "KeyD");
  expect(box(host).value).toBe("a");
  await touch("pointerdown", "KeyE", 0, "pen");
  expect(box(host).value).toBe("a");
  await touch("pointerup", "KeyE", 0, "pen");
  expect(box(host).value).toBe("ae");
  expect(document.activeElement).toBe(document.body);
  await unmount();
});

test("a click stops the demo for good, and without the text box it only presses the key", async () => {
  const { host, unmount } = await mount(<Keyboard demo="hi" />);
  await frames.advance(1000);
  await click(host, "KeyZ");
  await frames.advance(6000);
  expect(host.querySelectorAll("[data-down]")).toHaveLength(0);
  expect(host.querySelector("textarea")).toBeNull();
  expect(played).toBe(2);
  await unmount();
});
