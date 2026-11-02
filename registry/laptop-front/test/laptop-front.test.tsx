import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { LaptopFront } from "../src";
import { DESK, Laptop } from "../../laptop/src";

test("renders on the server the same twice, in the laptop's scene", () => {
  const render = () =>
    renderToString(
      <LaptopFront>
        <p>live</p>
      </LaptopFront>,
    );
  expect(render()).toBe(render());
  expect(render()).toContain('<svg viewBox="0 0 100 70"');
  expect(render()).toContain("<p>live</p>");
  expect(render()).not.toMatch(/NaN|Infinity/);
});

/** The toy inside its turntable, as the server draws it with no tab stop and no button. */
const drawing = (html: string) => {
  const body = html.indexOf(">", html.indexOf('class="vectoys-turntable-body"')) + 1;
  return html.slice(body, html.lastIndexOf("</div></div>"));
};

// It is the laptop item's realistic laptop at FRONT's look, never a copy of it.
test.each([undefined, <p key="live">live</p>])("draws what the laptop item draws, realistic at flat 1 and square on, with %p", (children) => {
  const front = drawing(
    renderToString(
      <LaptopFront draggable={false} fullscreen={false}>
        {children}
      </LaptopFront>,
    ),
  );
  expect(front).toStartWith("<div");
  expect(front).toBe(
    drawing(
      // In the div LaptopFront sets its finish on.
      renderToString(
        <div>
          <Laptop look="realistic" free flat={1} scale={0.685} y={0.04} draggable={false} fullscreen={false}>
            {children}
          </Laptop>
        </div>,
      ),
    ),
  );
});

test("empty it is a picture, with live content a group, under its label", () => {
  expect(renderToString(<LaptopFront />)).toContain('role="img" aria-label="Laptop"');
  expect(renderToString(<LaptopFront label="Our app">x</LaptopFront>)).toContain('role="group" aria-label="Our app"');
});

test("space black filters the aluminum through --vectoys-tint, and silver leaves it as it is", () => {
  expect(renderToString(<LaptopFront />)).not.toContain("--vectoys-tint:");
  expect(renderToString(<LaptopFront finish="silver" />)).not.toContain("--vectoys-tint:");
  expect(renderToString(<LaptopFront finish="black" />)).toContain('<div style="--vectoys-tint:brightness(0.255)">');
  expect(renderToString(<LaptopFront finish="black" />)).toContain("filter:var(--vectoys-tint)");
});

/** Every point a path's data reaches: its ends, control points and arcs' outer bounds, absolute or relative. */
function points(d: string): [number, number][] {
  const tokens = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
  const counts: Record<string, number> = { m: 2, l: 2, t: 2, h: 1, v: 1, c: 6, s: 4, q: 4, a: 7 };
  const out: [number, number][] = [];
  let [command, at, x, y, startX, startY] = ["", 0, 0, 0, 0, 0];
  while (at < tokens.length) {
    if (/[A-Za-z]/.test(tokens[at]!)) command = tokens[at++]!;
    if (command.toLowerCase() === "z") {
      [x, y] = [startX, startY];
      continue;
    }
    const kind = command.toLowerCase();
    const [ox, oy] = command === kind ? [x, y] : [0, 0];
    const args = Array.from({ length: counts[kind] ?? 2 }, () => Number(tokens[at++]));
    if (kind === "h") x = ox + args[0]!;
    else if (kind === "v") y = oy + args[0]!;
    else if (kind === "a") {
      [x, y] = [ox + args[5]!, oy + args[6]!];
      out.push([x - args[0]!, y - args[1]!], [x + args[0]!, y + args[1]!]);
    } else {
      for (let pair = 0; pair < args.length - 2; pair += 2) out.push([ox + args[pair]!, oy + args[pair + 1]!]);
      [x, y] = [ox + args[args.length - 2]!, oy + args[args.length - 1]!];
    }
    if (kind === "m") [startX, startY] = [x, y];
    out.push([x, y]);
  }
  return out;
}

test("the whole laptop stays inside its stage in every pose its limits reach", () => {
  // At the size and height LaptopFront draws it, which the test above holds it to.
  let bounds = [Infinity, Infinity, -Infinity, -Infinity];
  for (let yaw = -35; yaw <= 35; yaw += 5) {
    for (let roll = -30; roll <= 0; roll += 5) {
      const frame = DESK.trick({ lid: 1, yaw, pitch: DESK.pitch, flat: 1, x: 0, y: 0.04, scale: 0.685, roll }, false, true);
      for (const [name, d] of Object.entries(frame.d)) {
        if (name.startsWith("shadow")) continue;
        for (const [x, y] of points(d)) bounds = [Math.min(bounds[0]!, x), Math.min(bounds[1]!, y), Math.max(bounds[2]!, x), Math.max(bounds[3]!, y)];
      }
    }
  }
  const { width, height } = DESK.trick({ lid: 1, yaw: 0, pitch: DESK.pitch, flat: 1, x: 0, y: 0, scale: 1, roll: 0 }, false, true).camera;
  expect(bounds[0]).toBeGreaterThan(0);
  expect(bounds[1]).toBeGreaterThan(0);
  expect(bounds[2]).toBeLessThan(width);
  expect(bounds[3]).toBeLessThan(height);
});
