import { afterAll, expect, mock, test } from "bun:test";
import { fakeFrames, fire, mount } from "../../../packages/react/test/dom";
import { Gift } from "../src";

const frames = fakeFrames();
afterAll(frames.restore);

test("a click opens the gift and makes its surprise live, and another shuts it", async () => {
  const onOpenChange = mock((open: boolean) => open);
  const { host, unmount } = await mount(
    <Gift onOpenChange={onOpenChange}>
      <a href="#code">SAVE20</a>
    </Gift>,
  );
  const button = host.querySelector("button");
  const surprise = host.querySelector("a")?.parentElement;
  if (!button || !surprise) throw new Error("no button or surprise");
  expect(button.getAttribute("aria-expanded")).toBe("false");
  expect(surprise.hasAttribute("inert")).toBe(true);

  await fire(button, new MouseEvent("click", { bubbles: true }));
  expect(button.getAttribute("aria-expanded")).toBe("true");
  expect(surprise.hasAttribute("inert")).toBe(false);
  expect(onOpenChange).toHaveBeenLastCalledWith(true);
  await frames.advance(1400);

  await fire(button, new MouseEvent("click", { bubbles: true }));
  expect(button.getAttribute("aria-expanded")).toBe("false");
  expect(surprise.hasAttribute("inert")).toBe(true);
  await frames.advance(1400);
  await unmount();
});
