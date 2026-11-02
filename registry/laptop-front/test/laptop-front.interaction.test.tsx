import { afterAll, afterEach, expect, spyOn, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { fakeFrames, fire, mount } from "../../../packages/react/test/dom";
import { LaptopFront } from "../src";

// Frames wait for the test, so a glide after a release cannot move the laptop between two checks.
const frames = fakeFrames();
afterAll(frames.restore);
afterEach(() => document.body.replaceChildren());

test("renders on the client with no React warnings, its content live in the glass", async () => {
  const errors = spyOn(console, "error");
  try {
    let clicks = 0;
    const { host, unmount } = await mount(
      <LaptopFront finish="black">
        <button type="button" onClick={() => (clicks += 1)}>
          live
        </button>
      </LaptopFront>,
    );
    const button = host.querySelector("button");
    expect(button?.textContent).toBe("live");
    // In the glass: the laptop's group holds the content, laid out on its screen layer.
    const group = host.querySelector('[role="group"]');
    expect(button && group?.contains(button)).toBe(true);
    const transforms: string[] = [];
    for (let at = button?.parentElement; at && at !== group; at = at.parentElement) transforms.push(at.style.transform);
    expect(transforms).toContainEqual(expect.stringMatching(/^matrix3d\(/));
    button?.click();
    expect(clicks).toBe(1);
    expect(host.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("Laptop");
    expect(errors.mock.calls.map((call) => String(call[0]))).toEqual([]);
    await unmount();
  } finally {
    errors.mockRestore();
  }
});

const pointer = (type: string, x: number, y = 0) => new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, pointerType: "mouse", button: 0, buttons: 1, bubbles: true });

/** The laptop's drawing: its outlines, which a turn in 3D redraws. */
const drawn = (host: HTMLElement) => [...host.querySelectorAll("svg path")].map((path) => path.getAttribute("d")).join("|");

/** Drags from the middle of `target` by `dx` and `dy`, lets go and lets it settle. */
async function drag(target: Element, dx: number, dy: number) {
  await fire(target, pointer("pointerdown", 0, 0));
  await fire(target, pointer("pointermove", dx, dy));
  await fire(target, pointer("pointerup", dx, dy));
  await frames.advance(3000);
}

test("a drag across turns the laptop round in 3D, the display too, and its content still takes clicks", async () => {
  let clicks = 0;
  const { host, unmount } = await mount(
    <LaptopFront>
      <p>
        Some text <span onClick={() => (clicks += 1)}>here</span>
      </p>
    </LaptopFront>,
  );
  const text = host.querySelector("span")!;
  await fire(text, new MouseEvent("click", { bubbles: true, detail: 1 }));
  expect(clicks).toBe(1);
  const rest = drawn(host);
  await drag(text, 60, 0);
  // The drawing itself turns: a camera turn, not a tilt of the flat art.
  expect(drawn(host)).not.toBe(rest);
  expect(host.querySelector<HTMLElement>(".vectoys-turntable-body")?.style.transform ?? "").not.toContain("rotate");
  // The click that ends the drag is the turn's, not the content's.
  await fire(text, new MouseEvent("click", { bubbles: true, detail: 1 }));
  expect(clicks).toBe(1);
  await unmount();
});

test("a drag down looks down on it, and a drag up from rest stays level", async () => {
  const { host, unmount } = await mount(<LaptopFront />);
  const body = host.querySelector(".vectoys-turntable")!;
  const rest = drawn(host);
  await drag(body, 0, -400);
  expect(drawn(host)).toBe(rest);
  await drag(body, 0, 400);
  expect(drawn(host)).not.toBe(rest);
  await unmount();
});

test("with dragging and full screen off the laptop has no tab stop of its own and no full screen button", () => {
  const html = renderToString(<LaptopFront draggable={false} fullscreen={false} />);
  expect(html).not.toContain('tabindex="0"');
  expect(html).not.toContain("Full screen");
  expect(renderToString(<LaptopFront />)).toContain('aria-label="Full screen Laptop"');
});
