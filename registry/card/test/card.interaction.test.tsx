import { afterAll, expect, mock, test } from "bun:test";
import { fakeFrames, fire, mount } from "../../../packages/react/test/dom";
import { Card } from "../src";

const frames = fakeFrames();
afterAll(frames.restore);

test("a click flips the card over and back, and only the face towards the eye shows", async () => {
  const onFlipChange = mock((flipped: boolean) => flipped);
  const { host, unmount } = await mount(<Card front={<p>front</p>} back={<p>back</p>} onFlipChange={onFlipChange} />);
  const button = host.querySelector("button");
  if (!button) throw new Error("no button");
  // The screen a face lies on shows it only while it faces the eye.
  const shows = (text: string) => {
    let node = [...host.querySelectorAll("p")].find((p) => p.textContent === text)?.parentElement;
    while (node && !node.style.visibility) node = node.parentElement;
    return node?.style.visibility === "visible";
  };
  expect(button.getAttribute("aria-pressed")).toBe("false");
  expect([shows("front"), shows("back")]).toEqual([true, false]);

  await fire(button, new MouseEvent("click", { bubbles: true, detail: 0 }));
  expect(button.getAttribute("aria-pressed")).toBe("true");
  expect(onFlipChange).toHaveBeenLastCalledWith(true);
  await frames.advance(1500);
  expect([shows("front"), shows("back")]).toEqual([false, true]);

  await fire(button, new MouseEvent("click", { bubbles: true, detail: 0 }));
  expect(button.getAttribute("aria-pressed")).toBe("false");
  await frames.advance(1500);
  expect([shows("front"), shows("back")]).toEqual([true, false]);
  await unmount();
});
