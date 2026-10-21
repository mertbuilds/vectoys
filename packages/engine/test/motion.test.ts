import { expect, test } from "bun:test";
import { IDENTITY, rotate, rotateAxis, rotateX, rotateY, rotateZ, settled, slerp, spring, type Rotation, type Spring } from "../src";

const same = (actual: Rotation, expected: Rotation) => actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index]!, 9));

test("a turn about an axis matches the turns about x, y and z", () => {
  same(rotateAxis([1, 0, 0], 37), rotateX(37));
  same(rotateAxis([0, 2, 0], -120), rotateY(-120));
  same(rotateAxis([0, 0, 1], 200), rotateZ(200));
});

test("a turn about an axis leaves the axis where it is", () => {
  const axis = [1, 2, -0.5] as const;
  const turned = rotate(rotateAxis(axis, 73), axis);
  turned.forEach((value, index) => expect(value).toBeCloseTo(axis[index]!, 9));
});

test("slerp starts and ends on its rotations and turns evenly between", () => {
  const to = rotateAxis([1, 1, 0], 150);
  same(slerp(IDENTITY, to, 0), IDENTITY);
  same(slerp(IDENTITY, to, 1), to);
  same(slerp(rotateZ(10), rotateZ(90), 0.5), rotateZ(50));
  same(slerp(rotateX(180), rotateX(180), 0.3), rotateX(180));
});

test("slerp goes the short way round", () => {
  same(slerp(rotateY(-170), rotateY(170), 0.5), rotateY(180));
});

test("a spring overshoots a little and settles on its target", () => {
  let state: Spring = { value: 0, velocity: 0 };
  let highest = 0;
  for (let frame = 0; frame < 120; frame++) {
    state = spring(state, 1, 16);
    highest = Math.max(highest, state.value);
  }
  expect(highest).toBeGreaterThan(1);
  expect(highest).toBeLessThan(1.2);
  expect(settled(state, 1)).toBe(true);
});

test("a spring takes the same path in long frames as in short ones", () => {
  const long = spring({ value: 0, velocity: 0 }, 10, 48);
  let short: Spring = { value: 0, velocity: 0 };
  for (let frame = 0; frame < 3; frame++) short = spring(short, 10, 16);
  expect(long.value).toBeCloseTo(short.value, 9);
});
