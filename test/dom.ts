import { GlobalRegistrator } from "@happy-dom/global-registrator";

// A DOM for the interaction tests, so they can mount items and press them.
// The root preloads it; the test helpers import it too, so a package's own
// `bun test` gets it as well. Bun's own fetch stays, as the CLI tests serve
// a registry with Bun.serve.
if (!GlobalRegistrator.isRegistered) {
  const { fetch, Request, Response, Headers } = globalThis;
  GlobalRegistrator.register();
  Object.assign(globalThis, { fetch, Request, Response, Headers });
  // Tells React that updates in these tests run inside act().
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
}
