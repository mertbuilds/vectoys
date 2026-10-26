import { isLiveHost } from "./live-host";

/** The self-hosted OpenPanel event API. */
const OPENPANEL_API = "https://analytics.vinena.studio/api";

/**
 * Same-origin proxy for OpenPanel, so a blocker that knows the analytics host
 * does not drop the events. `/api/op/<path>` goes to the OpenPanel API.
 */
export async function proxyOpenPanel(request: Request): Promise<Response> {
  const url = new URL(request.url);
  // Analytics run on the live site only: a local or preview host forwards nothing.
  if (!isLiveHost(url.hostname)) return new Response(null, { status: 200 });
  const path = url.pathname.replace(/^\/api\/op/u, "");
  const upstream = new URL(`${OPENPANEL_API}${path}${url.search}`);
  const headers = new Headers(request.headers);
  headers.delete("cookie");
  headers.set("host", upstream.host);
  // The visitor's address, or OpenPanel counts every visit as one device.
  const ip = request.headers.get("cf-connecting-ip");
  if (ip !== null) {
    headers.set("openpanel-client-ip", ip);
    headers.set("x-client-ip", ip);
  }
  return fetch(upstream, {
    body: request.method === "GET" || request.method === "HEAD" ? null : await request.arrayBuffer(),
    headers,
    method: request.method,
    redirect: "manual",
  });
}
