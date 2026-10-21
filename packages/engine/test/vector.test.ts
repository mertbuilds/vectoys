import { expect, test } from "bun:test";
import { combine, compose, place, rotate, rotateX, rotateY, rotateZ, type Pose, type Solid } from "../src";

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
