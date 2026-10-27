import { afterEach, describe, expect, mock, test } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { setTracker } from "../src/analytics";
import { Faq } from "../src/sections/faq";

afterEach(() => {
  setTracker(null);
  document.body.innerHTML = "";
});

describe("Faq", () => {
  test("sends faq_open once when a question opens and nothing when it closes", () => {
    const sent = mock((_name: string, _properties?: Record<string, unknown>) => {});
    setTracker({ track: sent });
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    act(() => root.render(<Faq />));
    const button = host.querySelector<HTMLButtonElement>(".faq-button");
    if (!button) throw new Error("no question button");
    const question = button.textContent;

    act(() => button.click());
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(sent).toHaveBeenCalledTimes(1);
    expect(sent.mock.calls[0]).toEqual(["faq_open", { question }]);

    act(() => button.click());
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(sent).toHaveBeenCalledTimes(1);
    expect(button.hasAttribute("data-track")).toBe(false);
    act(() => root.unmount());
  });
});
