import { afterEach, expect, mock, test } from "bun:test";
import { fakeFrames, fire, mount } from "../../../packages/react/test/dom";
import { Keycap } from "../src";

const frames = fakeFrames();
afterEach(() => document.body.replaceChildren());

test("a keycap is held while pressed by pointer or key, and runs the page's own handlers first", async () => {
  const calls: string[] = [];
  const onPress = mock(() => calls.push("press"));
  const { host, unmount } = await mount(
    <Keycap
      onPress={onPress}
      onPointerDown={() => calls.push("pointerdown")}
      onPointerUp={() => calls.push("pointerup")}
      onKeyDown={() => calls.push("keydown")}
      onKeyUp={() => calls.push("keyup")}
      onBlur={() => calls.push("blur")}
    >
      Join
    </Keycap>,
  );
  const button = host.querySelector("button");
  if (!button) throw new Error("no button");

  await fire(button, new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
  expect(button.getAttribute("data-pressed")).toBe("true");
  await fire(button, new PointerEvent("pointerup", { bubbles: true }));
  expect(button.hasAttribute("data-pressed")).toBe(false);

  await fire(button, new KeyboardEvent("keydown", { bubbles: true, key: " " }));
  expect(button.getAttribute("data-pressed")).toBe("true");
  await fire(button, new KeyboardEvent("keyup", { bubbles: true, key: " " }));
  expect(button.hasAttribute("data-pressed")).toBe(false);

  await fire(button, new MouseEvent("click", { bubbles: true }));
  await fire(button, new FocusEvent("focusout", { bubbles: true }));
  expect(calls).toEqual(["pointerdown", "pointerup", "keydown", "keyup", "press", "blur"]);
  expect(onPress).toHaveBeenCalledTimes(1);
  await frames.advance(400);
  await unmount();
});

test("a disabled keycap is never held", async () => {
  const { host, unmount } = await mount(<Keycap disabled>Join</Keycap>);
  const button = host.querySelector("button");
  if (!button) throw new Error("no button");
  await fire(button, new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
  expect(button.hasAttribute("data-pressed")).toBe(false);
  await unmount();
});
