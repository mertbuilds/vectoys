import { proxyOpenPanel } from "./src/lib/op-proxy";

/** The bindings this Worker reads: the built site in dist/. */
export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

/** Serves the built site, and proxies `/api/op/*` to OpenPanel. */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/op/")) {
      if (request.method !== "GET" && request.method !== "POST") {
        return new Response(null, { status: 405, headers: { allow: "GET, POST" } });
      }
      return proxyOpenPanel(request);
    }
    return env.ASSETS.fetch(request);
  },
};
