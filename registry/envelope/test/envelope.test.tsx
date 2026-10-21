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
  expect(html).toContain('<svg viewBox="0 0 100 120"');
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
