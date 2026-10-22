import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { Floppy, SLIDE, seen } from "../src";

test("renders on the server as a download link named by its label", () => {
  const html = renderToString(
    <Floppy href="/kit.zip" download="press-kit.zip" finish="#2f4f86">
      press-kit.zip
    </Floppy>,
  );
  expect(html).toContain('<svg viewBox="0 0 100 100"');
  expect(html).toMatch(/<a href="\/kit.zip" download="press-kit.zip"[^>]*><span[^>]*>press-kit.zip<\/span><\/a>/);
  expect(html).toContain("--vectoys-finish:#2f4f86");
  expect(html).not.toContain("NaN");
});

test("a link keeps the file's own name unless told, and without a link the disk is a button", () => {
  expect(renderToString(<Floppy href="/kit.zip">kit</Floppy>)).toContain('download=""');
  const button = renderToString(<Floppy label="Save the date to your calendar">Save the date</Floppy>);
  expect(button).toMatch(/<button type="button" aria-label="Save the date to your calendar"/);
  expect(button).not.toContain("<a ");
});

test("hovering slides the shutter open and turns the disk, pressing pushes it back", () => {
  const rest = seen(0, 0);
  const hover = seen(1, 0);
  const pressed = seen(1, 1);
  const hull = (view: ReturnType<typeof seen>, part: string) => view.drawn.hulls.find((each) => each.part === part)!;
  const left = (view: ReturnType<typeof seen>) => Math.min(...hull(view, "shutter-left").points.map(([x]) => x));
  expect(left(hover)).toBeLessThan(left(rest));
  expect(hull(hover, "body").d).not.toBe(hull(rest, "body").d);
  expect(pressed.body.position[1]).toBeLessThan(hover.body.position[1]);
  expect(SLIDE).toBeGreaterThan(0);
  for (const view of [rest, hover, pressed]) expect(JSON.stringify(view.drawn)).not.toContain("NaN");
});

test("the shutter draws over the opening it slides across", () => {
  const parts = seen().drawn.hulls.map((hull) => hull.part);
  expect(parts.indexOf("shutter-left")).toBeGreaterThan(parts.indexOf("opening"));
  expect(parts.indexOf("opening")).toBeGreaterThan(parts.indexOf("body"));
});
