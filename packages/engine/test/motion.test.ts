import { expect, test } from "bun:test";
import { settled, spring } from "../src";

test("a spring moves toward its target and settles there", () => {
  let state = { value: 0, velocity: 0 };
  state = spring(state, 4, 0.05);
  expect(state.value).toBeGreaterThan(0);
  expect(state.value).toBeLessThan(4);
  state = spring(state, 4, 2);
  expect(settled(state, 4)).toBe(true);
});

test("a spring under critical damping overshoots a little on its way back", () => {
  let lowest = Infinity;
  let state = { value: 4, velocity: 0 };
  for (let frame = 0; frame < 60; frame++) {
    state = spring(state, 0, 1 / 60);
    lowest = Math.min(lowest, state.value);
  }
  expect(lowest).toBeLessThan(0);
  expect(lowest).toBeGreaterThan(-1);
});

test("the result does not depend on how the time is cut into frames", () => {
  const once = spring({ value: 0, velocity: 0 }, 1, 0.2);
  let many = { value: 0, velocity: 0 };
  for (let frame = 0; frame < 48; frame++) many = spring(many, 1, 0.2 / 48);
  expect(many.value).toBeCloseTo(once.value, 2);
});

test("no time leaves a spring where it was", () => {
  expect(spring({ value: 2, velocity: 1 }, 0, 0)).toEqual({ value: 2, velocity: 1 });
  expect(spring({ value: 2, velocity: 1 }, 0, -1)).toEqual({ value: 2, velocity: 1 });
});

test("a spring with its own stiffness and damping overshoots a little and settles on its target", () => {
  let state = { value: 0, velocity: 0 };
  let highest = 0;
  for (let frame = 0; frame < 120; frame++) {
    state = spring(state, 1, 0.016, { stiffness: 170, damping: 20 });
    highest = Math.max(highest, state.value);
  }
  expect(highest).toBeGreaterThan(1);
  expect(highest).toBeLessThan(1.2);
  expect(settled(state, 1)).toBe(true);
});
