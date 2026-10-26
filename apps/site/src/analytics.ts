import { isLiveHost } from "./lib/live-host";

/** The site's OpenPanel project. The id is public by design. */
const OPENPANEL_CLIENT_ID = "7572a7d7-3c45-4516-86b2-17ac35aa6e29";

/**
 * Loads OpenPanel through the same-origin proxy (`/api/op`), on the live site
 * only: nothing loads in dev, a local build or a preview.
 */
export function startAnalytics(): void {
  if (!isLiveHost(window.location.hostname)) return;
  void import("@openpanel/web")
    .then(({ OpenPanel }) => {
      new OpenPanel({
        apiUrl: "/api/op",
        clientId: OPENPANEL_CLIENT_ID,
        trackAttributes: true,
        trackOutgoingLinks: true,
        trackScreenViews: true,
      });
    })
    .catch((error: unknown) => console.warn("@openpanel/web failed to load", error));
}
