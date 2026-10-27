import type { OpenPanelOptions } from "@openpanel/web";
import { isLiveHost } from "./lib/live-host";

/** The site's OpenPanel project. The id is public by design. */
const OPENPANEL_CLIENT_ID = "7572a7d7-3c45-4516-86b2-17ac35aa6e29";

/**
 * What OpenPanel starts with. Clicks on elements with `data-track` send that
 * event with their other `data-*` attributes as properties. 2% of page loads
 * record a light session replay: a full snapshot each minute, sent every 50
 * events, typed input masked, and the per-frame animations (`data-replay-block`)
 * left out. Page text is the same for every reader, so it is not masked.
 */
export const OPENPANEL_OPTIONS: OpenPanelOptions = {
  apiUrl: "/api/op",
  clientId: OPENPANEL_CLIENT_ID,
  trackAttributes: true,
  trackOutgoingLinks: true,
  trackScreenViews: true,
  sessionReplay: {
    enabled: true,
    sampleRate: 0.02,
    flushIntervalMs: 60_000,
    maxEventsPerChunk: 50,
    maskAllInputs: true,
    maskAllText: false,
    blockSelector: "[data-replay-block]",
  },
};

/**
 * Loads OpenPanel through the same-origin proxy (`/api/op`), on the live site
 * only: nothing loads in dev, a local build or a preview.
 */
export function startAnalytics(): void {
  if (!isLiveHost(window.location.hostname)) return;
  void import("@openpanel/web")
    .then(({ OpenPanel }) => {
      new OpenPanel(OPENPANEL_OPTIONS);
    })
    .catch((error: unknown) => console.warn("@openpanel/web failed to load", error));
}
