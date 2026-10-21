import { expect, test } from "bun:test";
import { IDENTITY, combine, compose, place, rotate, rotateAxis, rotateX, rotateY, rotateZ, slerp, type Pose, type Rotation, type Solid } from "../src";

const close = (actual: Solid, expected: Solid) => actual.forEach((value, axis) => expect(value).toBeCloseTo(expected[axis]!, 12));

test("rotations turn the same way as CSS", () => {
  close(rotate(rotateX(90), [0, 1, 0]), [0, 0, 1]);
  close(rotate(rotateY(90), [0, 0, 1]), [1, 0, 0]);
  close(rotate(rotateZ(90), [1, 0, 0]), [0, 1, 0]);
});

test("combine applies the last rotation first", () => {
  const point: Solid = [1, 2, 3];
  close(rotate(combine(rotateZ(30), rotateX(40)), point), rotate(rotateZ(30), rotate(rotateX(40), point)));
});

test("a composed pose places a point as the two poses in turn", () => {
  const base: Pose = { position: [1, 2, 3], rotation: rotateZ(25) };
  const lid: Pose = { position: [0, -5, 1], rotation: rotateX(-100) };
  const point: Solid = [3, -2, 0.5];
  close(place(compose(base, lid), point), place(base, place(lid, point)));
});

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
