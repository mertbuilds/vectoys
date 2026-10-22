import { afterEach, expect, test } from "bun:test";
import { useSpring } from "../src";
import { fakeFrames, mount, reducedMotion } from "./dom";

const Value = ({ target }: { target: number }) => <output>{useSpring(target).toFixed(3)}</output>;
const read = (host: HTMLElement) => Number(host.querySelector("output")?.textContent);

let cleanup: (() => void)[] = [];
afterEach(() => {
  cleanup.forEach((undo) => undo());
  cleanup = [];
});

test("a spring moves towards a new target over frames, overshoots a little and comes to rest on it", async () => {
  const frames = fakeFrames();
  cleanup.push(frames.restore);
  const { host, rerender, unmount } = await mount(<Value target={0} />);
  await rerender(<Value target={1} />);
  await frames.advance(48);
  const early = read(host);
  expect(early).toBeGreaterThan(0);
  expect(early).toBeLessThan(1);
  let highest = early;
  for (let frame = 0; frame < 60; frame++) {
    await frames.advance(16);
    highest = Math.max(highest, read(host));
  }
  expect(highest).toBeGreaterThan(1);
  expect(read(host)).toBe(1);
  expect(frames.pending()).toBe(0);
  await unmount();
});

test("under reduced motion a spring jumps to its target with no frames", async () => {
  const frames = fakeFrames();
  const reduced = reducedMotion(true);
  cleanup.push(frames.restore, reduced.restore);
  const { host, rerender, unmount } = await mount(<Value target={0} />);
  await rerender(<Value target={1} />);
  expect(read(host)).toBe(1);
  await unmount();
});
