import { afterAll, expect, mock, test } from "bun:test";
import { fakeFrames, fire, mount } from "../../../packages/react/test/dom";
import { Floppy } from "../src";

const frames = fakeFrames();
afterAll(frames.restore);

test("with an address the disk is a download link, and a press calls onPress", async () => {
  const onPress = mock(() => {});
  const { host, unmount } = await mount(
    <Floppy href="/kit.zip" download="kit.zip" onPress={onPress}>
      Press kit
    </Floppy>,
  );
  const link = host.querySelector("a");
  expect(link?.getAttribute("href")).toBe("/kit.zip");
  expect(link?.getAttribute("download")).toBe("kit.zip");
  expect(host.querySelector("button")).toBeNull();
  link?.addEventListener("click", (event) => event.preventDefault());
  await fire(link ?? host, new MouseEvent("click", { bubbles: true, cancelable: true }));
  expect(onPress).toHaveBeenCalledTimes(1);
  await unmount();
});

test("without an address the disk is a button, held while a key or pointer is down", async () => {
  const onPress = mock(() => {});
  const { host, unmount } = await mount(<Floppy onPress={onPress}>Save</Floppy>);
  const button = host.querySelector("button");
  if (!button) throw new Error("no button");
  expect(host.querySelector("a")).toBeNull();
  await fire(button, new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
  expect(button.getAttribute("data-pressed")).toBe("true");
  await fire(button, new KeyboardEvent("keyup", { bubbles: true, key: "Enter" }));
  expect(button.hasAttribute("data-pressed")).toBe(false);
  await fire(button, new MouseEvent("click", { bubbles: true }));
  expect(onPress).toHaveBeenCalledTimes(1);
  await frames.advance(600);
  await unmount();
});
