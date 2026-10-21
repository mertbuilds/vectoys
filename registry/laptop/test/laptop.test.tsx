import { expect, test } from "bun:test";
import { screenQuad } from "@vectoys/engine";
import { renderToString } from "react-dom/server";
import { DESK, GLASS, Laptop, PHONE } from "../src";

test.each([
  [DESK, "0 0 100 70"],
  [PHONE, "0 0 100 59"],
] as const)("renders on the server with the eye's viewBox", (eye, viewBox) => {
  for (const closed of [0, 0.5, 1]) {
    const html = renderToString(
      <Laptop eye={eye} closed={closed}>
        <p>live</p>
      </Laptop>,
    );
    expect(html).toContain(`<svg viewBox="${viewBox}"`);
    expect(html).toContain("<p>live</p>");
    expect(html).not.toContain("NaN");
  }
});

// Where the Agent Caffeine hero measured the open display's glass by hand.
test.each([DESK, PHONE])("the open lid's glass lies where the hero put it", (eye) => {
  const quad = screenQuad(eye.camera, eye.lidWorld(0), GLASS, { width: 1, height: 1 });
  const [[left, top], , [right, bottom]] = quad.corners;
  expect(quad.facing).toBe(true);
  expect(left).toBeCloseTo(23.07, 2);
  expect(top).toBeCloseTo(6.21, 2);
  expect(right - left).toBeCloseTo(53.86, 2);
  expect(bottom - top).toBeCloseTo(35, 0);
});

test("the shut lid hides the glass", () => {
  expect(screenQuad(DESK.camera, DESK.lidWorld(1), GLASS, { width: 1, height: 1 }).facing).toBe(false);
});
