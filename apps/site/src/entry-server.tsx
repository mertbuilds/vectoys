import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { App } from "./app";
import type { RegistryIndex } from "./registry";

/** The page's markup, drawn at build time from the registry index. */
export function render(index: RegistryIndex) {
  return renderToString(
    <StrictMode>
      <App index={index} />
    </StrictMode>,
  );
}
