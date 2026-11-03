import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { Envelope, RISE, seen, shown, stages } from "../src";

const FORM = <input type="email" aria-label="Email" />;

test.each([0, 0.3, 0.6, 1])("renders on the server, open %p", (open) => {
  const html = renderToString(
    <Envelope open={open} finish="#c9d8c5">
      {FORM}
    </Envelope>,
  );
  expect(html).toContain('<svg viewBox="0 0 115 138"');
  expect(html).toContain('aria-label="Email"');
  expect(html).toContain("--vectoys-finish:#c9d8c5");
  expect(html).not.toContain("NaN");
});

test("the opener is a real button that tells whether the envelope is open", () => {
  const shut = renderToString(<Envelope label="Open the newsletter">{FORM}</Envelope>);
  expect(shut).toMatch(/<button type="button" aria-label="Open the newsletter" aria-expanded="false"/);
  expect(renderToString(<Envelope defaultOpen>{FORM}</Envelope>)).toContain('aria-expanded="true"');
  expect(renderToString(<Envelope open={1}>{FORM}</Envelope>)).toContain('aria-expanded="true"');
});

test("the letter's content is out of reach until the flap has swung past upright", () => {
  const shut = renderToString(<Envelope open={0}>{FORM}</Envelope>);
  expect(shut).toContain('inert=""');
  expect(shut).toContain("visibility:hidden");
  const open = renderToString(<Envelope open={1}>{FORM}</Envelope>);
  expect(open).not.toContain("inert");
});

test("the flap draws over the pocket while shut and behind the card once past upright", () => {
  // The two side flaps share an order and never overlap, so either may draw first.
  const order = (open: number) => seen(open).drawn.hulls.map((hull) => hull.part).filter((part) => !part.startsWith("pocket-") || part === "pocket-bottom");
  expect(order(0)).toEqual(["back", "card", "pocket-bottom", "flap"]);
  expect(order(1)).toEqual(["back", "flap", "card", "pocket-bottom"]);
});

test("opening turns the flap first, then lifts the card", () => {
  expect(stages(0)).toEqual({ flap: 0, rise: 0 });
  expect(stages(0.3).flap).toBeGreaterThan(90);
  expect(stages(0.3).rise).toBe(0);
  expect(stages(1)).toEqual({ flap: 180, rise: RISE });
  expect(stages(2)).toEqual(stages(1));
  const card = (open: number) => seen(open).card.position[2];
  expect(card(1)).toBeGreaterThan(card(0));
  const flap = (open: number) => seen(open).drawn.hulls.find((hull) => hull.part === "flap")!.d;
  expect(flap(0.5)).not.toBe(flap(0));
});

test("the card's content is clipped to what shows over the pocket", () => {
  expect(shown(0)).toMatch(/^polygon\(0% 0%, 100% 0%, /);
  // Shut, the pocket's sides reach over the card's top corners; risen, the card's top half shows.
  expect(shown(0)).toContain("100% 0%, 100% 0%");
  expect(shown(RISE)).not.toContain("100% 0%, 100% 0%");
});

/** The x and y of every point in SVG path data. */
const points = (d: string) => {
  const numbers = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  return numbers.flatMap((value, index) => (index % 2 === 0 ? [[value, numbers[index + 1]!] as const] : []));
};

test("turned any way within its limits, open or shut, the envelope and its shadow stay finite and inside the box", () => {
  for (const open of [0, 0.3, 0.5, 0.75, 1])
    for (let yaw = -180; yaw <= 180; yaw += 15)
      for (const pitch of [-20, -10, 0, 8, 14]) {
        const view = seen(open, { yaw, pitch });
        const { width, height } = view.camera;
        // The far shadow blurs by 3 units across and 1.6 down; all but a trace of it lies within 2.5 times that of its outline.
        const blur = [7.5, 4] as const;
        const outline = [...view.drawn.faces.map((face) => face.d), ...view.drawn.hulls.map((hull) => hull.d), ...(view.shadow ? [view.shadow.contact] : [])].flatMap(points);
        const shadow = view.shadow ? points(view.shadow.ground).flatMap(([x, y]) => [[x - blur[0], y - blur[1]], [x + blur[0], y + blur[1]]] as const) : [];
        const drawn = [...outline, ...shadow];
        expect(drawn.length).toBeGreaterThan(0);
        for (const [x, y] of drawn) {
          expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(width);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(height);
        }
        // The eye never drops under the ground, so the shadow never drops out of sight.
        expect(view.shadow).not.toBeNull();
      }
});

test("at rest the turn changes nothing", () => {
  for (const open of [0, 0.5, 1]) {
    const [turned, rest] = [seen(open, { yaw: 0, pitch: 0 }), seen(open)];
    expect([turned.drawn, turned.shadow, turned.card, turned.clip]).toEqual([rest.drawn, rest.shadow, rest.card, rest.clip]);
  }
});

test("turned round, the plain front covers the rest, and the open flap lies over the card once flat", () => {
  const order = (open: number, yaw: number) => seen(open, { yaw, pitch: 0 }).drawn.hulls.map((hull) => hull.part).filter((part) => !part.startsWith("pocket-") || part === "pocket-bottom");
  expect(seen(0, { yaw: 180, pitch: 0 }).fromBack).toBe(false);
  expect(seen(0, { yaw: 60, pitch: 0 }).fromBack).toBe(true);
  expect(order(0, 180)).toEqual(["flap", "pocket-bottom", "card", "back"]);
  expect(order(0.3, 180)).toEqual(["flap", "pocket-bottom", "card", "back"]);
  expect(order(1, 180)).toEqual(["pocket-bottom", "card", "flap", "back"]);
  // The pocket's sheets face only the back, so from the front only the slabs draw.
  expect(seen(1, { yaw: 180, pitch: 0 }).drawn.faces.some((face) => face.part.startsWith("pocket-"))).toBe(false);
});
