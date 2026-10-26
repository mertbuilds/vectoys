const LIVE_HOSTS = new Set(["vectoys.com", "www.vectoys.com"]);

/** True only on the production hosts: dev, a local build and a preview are not live. */
export function isLiveHost(hostname: string): boolean {
  return LIVE_HOSTS.has(hostname);
}
