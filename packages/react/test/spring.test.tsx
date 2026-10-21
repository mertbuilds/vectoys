import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { useSpring } from "../src";

const Value = ({ target }: { target: number }) => <output>{useSpring(target)}</output>;

test("the server draws a spring at its target, with no motion to wait for", () => {
  expect(renderToString(<Value target={4} />)).toBe("<output>4</output>");
});
