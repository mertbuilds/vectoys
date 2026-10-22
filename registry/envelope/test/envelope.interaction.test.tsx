import { afterAll, expect, mock, test } from "bun:test";
import { fakeFrames, fire, mount } from "../../../packages/react/test/dom";
import { Envelope } from "../src";

const frames = fakeFrames();
afterAll(frames.restore);

test("a click opens the envelope, and its letter comes alive once out", async () => {
  const onOpenChange = mock((open: boolean) => open);
  const { host, unmount } = await mount(
    <Envelope onOpenChange={onOpenChange}>
      <a href="#join">Join</a>
    </Envelope>,
  );
  const opener = host.querySelector("button");
  const letter = host.querySelector("a")?.parentElement;
  if (!opener || !letter) throw new Error("no opener or letter");
  expect(opener.getAttribute("aria-expanded")).toBe("false");
  expect(letter.hasAttribute("inert")).toBe(true);

  await fire(opener, new MouseEvent("click", { bubbles: true }));
  expect(opener.getAttribute("aria-expanded")).toBe("true");
  expect(onOpenChange).toHaveBeenCalledWith(true);
  await frames.advance(1500);
  expect(letter.hasAttribute("inert")).toBe(false);

  await fire(opener, new MouseEvent("click", { bubbles: true }));
  expect(opener.getAttribute("aria-expanded")).toBe("false");
  await frames.advance(1500);
  expect(letter.hasAttribute("inert")).toBe(true);
  await unmount();
});

test("a page that drives the envelope decides how far open it is", async () => {
  const { host, rerender, unmount } = await mount(<Envelope open={0}>Hi</Envelope>);
  const opener = host.querySelector("button");
  await fire(opener ?? host, new MouseEvent("click", { bubbles: true }));
  expect(opener?.getAttribute("aria-expanded")).toBe("false");
  await rerender(<Envelope open={1}>Hi</Envelope>);
  expect(opener?.getAttribute("aria-expanded")).toBe("true");
  await unmount();
});
