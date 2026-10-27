import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Showcase } from "../src/sections/showcase";

type Watcher = { callback: IntersectionObserverCallback; targets: Element[] };
let watchers: Watcher[] = [];
let reduced = false;
let host: HTMLDivElement;
let root: Root;
const realObserver = globalThis.IntersectionObserver;
const realMatchMedia = globalThis.matchMedia;

/** Tells every observer that the clips are in view, or not. */
function scroll(inView: boolean) {
  for (const watcher of watchers) {
    const entries = watcher.targets.map((target) => ({ target, isIntersecting: inView }) as IntersectionObserverEntry);
    act(() => watcher.callback(entries, {} as IntersectionObserver));
  }
}

beforeEach(() => {
  watchers = [];
  reduced = false;
  globalThis.IntersectionObserver = class {
    readonly watcher: Watcher;
    constructor(callback: IntersectionObserverCallback) {
      this.watcher = { callback, targets: [] };
      watchers.push(this.watcher);
    }
    observe(target: Element) {
      this.watcher.targets.push(target);
    }
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
  globalThis.matchMedia = ((query: string) => ({
    matches: query.includes("reduced-motion") ? reduced : false,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof matchMedia;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
  globalThis.IntersectionObserver = realObserver;
  globalThis.matchMedia = realMatchMedia;
  mock.restore();
});

describe("Showcase", () => {
  test("links each product out with UTM and an outbound_click event", () => {
    act(() => root.render(<Showcase />));
    const links = [...host.querySelectorAll<HTMLAnchorElement>("a.showcase-card")];
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "https://caffeinagent.com/?utm_source=vectoys.com&utm_medium=referral&utm_campaign=showcase",
      "https://waxmac.com/?utm_source=vectoys.com&utm_medium=referral&utm_campaign=showcase",
    ]);
    for (const link of links) {
      expect(link.dataset.track).toBe("outbound_click");
      expect(link.dataset.placement).toBe("showcase");
      expect(link.target).toBe("_blank");
    }
    expect(links.map((link) => link.dataset.to)).toEqual(["caffeinagent.com", "waxmac.com"]);
  });

  test("holds every clip unloaded, sized and silent until it comes near", () => {
    act(() => root.render(<Showcase />));
    const videos = [...host.querySelectorAll("video")];
    expect(videos).toHaveLength(4);
    for (const video of videos) {
      expect(video.getAttribute("preload")).toBe("none");
      expect(video.getAttribute("width")).toBe("1280");
      expect(video.getAttribute("height")).toBe("800");
      expect(video.hasAttribute("loop")).toBe(true);
      expect(video.hasAttribute("playsinline")).toBe(true);
      expect(video.getAttribute("poster")).toMatch(/^\/showcase\/(caffeinagent|wax)-(light|dark)\.webp$/);
      expect(video.closest("[data-replay-block]")).not.toBeNull();
    }
  });

  test("plays only the clip of the page's scheme while it is in view", () => {
    const play = spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
    const pause = spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    act(() => root.render(<Showcase />));
    expect(play).not.toHaveBeenCalled();

    scroll(true);
    const played = play.mock.contexts as unknown as HTMLVideoElement[];
    expect(played.length).toBeGreaterThan(0);
    expect(played.every((video) => video.dataset.scheme === "light" && video.muted)).toBe(true);
    for (const video of host.querySelectorAll<HTMLVideoElement>("video[data-scheme=light]")) expect(video.preload).toBe("auto");
    for (const video of host.querySelectorAll<HTMLVideoElement>("video[data-scheme=dark]")) expect(video.getAttribute("preload")).toBe("none");

    pause.mockClear();
    scroll(false);
    expect(pause.mock.contexts).toContain(host.querySelector("video[data-scheme=light]"));
  });

  test("never loads or plays a clip with reduced motion, so the poster stays", () => {
    reduced = true;
    const play = spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
    act(() => root.render(<Showcase />));
    scroll(true);
    expect(play).not.toHaveBeenCalled();
    for (const video of host.querySelectorAll("video")) expect(video.getAttribute("preload")).toBe("none");
  });
});
