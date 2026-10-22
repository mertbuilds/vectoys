import { afterAll, expect, mock, test } from "bun:test";
import { fakeFrames, fire, mount } from "../../../packages/react/test/dom";
import { Dice, ROLL_MS, WOBBLE_MS } from "../src";

const frames = fakeFrames();
afterAll(frames.restore);

test("a roll lands on the given face, reads it out, and reads it out again on the next roll", async () => {
  const onRoll = mock((value: number) => value);
  const { host, unmount } = await mount(<Dice value={3} onRoll={onRoll} />);
  const button = host.querySelector("button");
  const live = host.querySelector("[aria-live]");
  if (!button || !live) throw new Error("no button or live region");
  expect(live.textContent).toBe("Showing 3");

  for (const round of [1, 2]) {
    await fire(button, new MouseEvent("click", { bubbles: true }));
    await frames.advance(32);
    // Empty in the air, so the same face landing again is still read out.
    expect(live.textContent).toBe("");
    await frames.advance(ROLL_MS + WOBBLE_MS + 100);
    expect(live.textContent).toBe("Showing 3");
    expect(onRoll).toHaveBeenCalledTimes(round);
  }
  expect(onRoll).toHaveBeenLastCalledWith(3);
  await unmount();
});
