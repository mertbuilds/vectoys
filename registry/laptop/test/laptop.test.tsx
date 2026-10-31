import { expect, test } from "bun:test";
import { screenQuad } from "@vinena/vectoys";
import { renderToString } from "react-dom/server";
import { DESK, FRONT, GLASS, Laptop, PHONE } from "../src";

test.each([
  [DESK, "0 0 100 70"],
  [PHONE, "0 0 100 59"],
  [FRONT, "0 0 70 50"],
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

test.each([DESK, PHONE, FRONT])("the shut lid hides the glass", (eye) => {
  expect(screenQuad(eye.camera, eye.lidWorld(1), GLASS, { width: 1, height: 1 }).facing).toBe(false);
});

test("the speaker holes are clipped to the deck top", () => {
  const html = renderToString(<Laptop eye={FRONT} />);
  const clip = html.match(/<clipPath id="([^"]+-deck)">/)?.[1];
  expect(clip).toBeDefined();
  expect(html).toContain(`<g clip-path="url(#${clip})"><path d=`);
  expect(html).toMatch(/clip-path="url\(#[^)]+-deck\)"><path[^>]*vectoys-laptop-holes-0/);
});

test("seen from the front, the server draws the laptop the same twice", () => {
  const render = () =>
    renderToString(
      <Laptop eye={FRONT}>
        <p>live</p>
      </Laptop>,
    );
  expect(render()).toBe(render());
  expect(render()).not.toContain("NaN");
});

test("seen from the front, the open lid's glass is a plain rectangle at the glass's aspect", () => {
  const quad = screenQuad(FRONT.camera, FRONT.lidWorld(0), GLASS, { width: GLASS.width, height: GLASS.height });
  const [topLeft, topRight, bottomRight, bottomLeft] = quad.corners;
  expect(quad.facing).toBe(true);
  expect(topRight[1]).toBeCloseTo(topLeft[1], 6);
  expect(bottomLeft[1]).toBeCloseTo(bottomRight[1], 6);
  expect(bottomRight[0]).toBeCloseTo(topRight[0], 6);
  expect(bottomLeft[0]).toBeCloseTo(topLeft[0], 6);
  expect((topRight[0] - topLeft[0]) / (bottomRight[1] - topLeft[1])).toBeCloseTo(GLASS.width / GLASS.height, 3);
  // A scale and a move, with nothing in the matrix's perspective or skew terms.
  const columns = (quad.matrix ?? "").slice("matrix3d(".length, -1).split(",").map(Number);
  expect(columns).toHaveLength(16);
  for (const at of [1, 2, 3, 4, 6, 7]) expect(columns[at]).toBeCloseTo(0, 6);
});

test("the glass clips live HTML to its rounded top corners", () => {
  const html = renderToString(<Laptop><p>live</p></Laptop>);
  const styles = [...html.matchAll(/style="([^"]*)"/g)].map((match) => match[1] ?? "").filter((style) => style.includes("container-type:inline-size") && style.includes("border-radius:"));
  expect(styles).toHaveLength(1);
  for (const style of styles) {
    const radius = style.match(/border-radius:([^;]+)/)?.[1];
    expect(radius).toBeDefined();
    expect(style).toContain(`clip-path:inset(0 round ${radius})`);
  }
});
