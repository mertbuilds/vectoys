import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { isLiveHost } from "../src/lib/live-host";
import { proxyOpenPanel } from "../src/lib/op-proxy";
import worker, { type Env } from "../worker";

const post = (url: string): Request =>
  new Request(url, {
    body: '{"type":"track"}',
    headers: { "cf-connecting-ip": "203.0.113.7", cookie: "a=b" },
    method: "POST",
  });

afterEach(() => {
  mock.restore();
});

describe("isLiveHost", () => {
  test("is true only for vectoys.com and www.vectoys.com", () => {
    expect(isLiveHost("vectoys.com")).toBe(true);
    expect(isLiveHost("www.vectoys.com")).toBe(true);
    for (const host of ["localhost", "vectoys.localhost", "vectoys.x.workers.dev", "vectoys.com.example.com"]) {
      expect(isLiveHost(host)).toBe(false);
    }
  });
});

describe("proxyOpenPanel", () => {
  test("forwards nothing off the live site", async () => {
    const sent = spyOn(globalThis, "fetch").mockResolvedValue(new Response(null));
    for (const origin of ["http://localhost:5173", "https://vectoys.localhost", "https://vectoys.x.workers.dev"]) {
      const answer = await proxyOpenPanel(post(`${origin}/api/op/track`));
      expect(answer.status).toBe(200);
    }
    expect(sent).not.toHaveBeenCalled();
  });

  test("sends a live event to OpenPanel with the visitor address and no cookie", async () => {
    const sent = spyOn(globalThis, "fetch").mockResolvedValue(new Response(null));
    await proxyOpenPanel(post("https://vectoys.com/api/op/track"));
    expect(sent).toHaveBeenCalledTimes(1);
    const [upstream, init] = sent.mock.calls[0] ?? [];
    expect(String(upstream)).toBe("https://analytics.vinena.studio/api/track");
    expect(init?.method).toBe("POST");
    expect(init?.redirect).toBe("manual");
    expect(await new Response(init?.body).text()).toBe('{"type":"track"}');
    const headers = new Headers(init?.headers);
    expect(headers.get("openpanel-client-ip")).toBe("203.0.113.7");
    expect(headers.get("x-client-ip")).toBe("203.0.113.7");
    expect(headers.get("host")).toBe("analytics.vinena.studio");
    expect(headers.get("cookie")).toBeNull();
  });

  test("keeps the query string and sends no body for GET", async () => {
    const sent = spyOn(globalThis, "fetch").mockResolvedValue(new Response(null));
    await proxyOpenPanel(new Request("https://www.vectoys.com/api/op/track/device?client=a&b=1"));
    const [upstream, init] = sent.mock.calls[0] ?? [];
    expect(String(upstream)).toBe("https://analytics.vinena.studio/api/track/device?client=a&b=1");
    expect(init?.body).toBeNull();
  });
});

describe("worker", () => {
  const env = (): Env & { calls: string[] } => {
    const calls: string[] = [];
    return { calls, ASSETS: { fetch: async (request) => (calls.push(request.url), new Response("asset")) } };
  };

  test("sends /api/op/* to the proxy", async () => {
    const sent = spyOn(globalThis, "fetch").mockResolvedValue(new Response("proxied"));
    const bindings = env();
    const answer = await worker.fetch(post("https://vectoys.com/api/op/track"), bindings);
    expect(await answer.text()).toBe("proxied");
    expect(sent).toHaveBeenCalledTimes(1);
    expect(bindings.calls).toEqual([]);
  });

  test("sends every other path to the assets", async () => {
    const sent = spyOn(globalThis, "fetch").mockResolvedValue(new Response(null));
    const bindings = env();
    const answer = await worker.fetch(new Request("https://vectoys.com/"), bindings);
    expect(await answer.text()).toBe("asset");
    expect(bindings.calls).toEqual(["https://vectoys.com/"]);
    expect(sent).not.toHaveBeenCalled();
  });

  test("answers 405 to other methods on /api/op/*", async () => {
    const sent = spyOn(globalThis, "fetch").mockResolvedValue(new Response(null));
    const bindings = env();
    const answer = await worker.fetch(new Request("https://vectoys.com/api/op/x", { method: "PUT" }), bindings);
    expect(answer.status).toBe(405);
    expect(sent).not.toHaveBeenCalled();
    expect(bindings.calls).toEqual([]);
  });
});
