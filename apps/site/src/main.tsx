import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "./app";
import { INDEX_DATA, type RegistryIndex } from "./registry";
import "./style.css";

const root = document.getElementById("root");
if (!root) throw new Error("The page has no #root to draw into.");
// The built page comes drawn, with the registry index it was drawn from; in dev it is drawn here.
const data = document.getElementById(INDEX_DATA)?.textContent;
const index: RegistryIndex | null = data ? JSON.parse(data) : null;
const app = (
  <StrictMode>
    <App index={index} />
  </StrictMode>
);

if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);

if (import.meta.env.DEV) {
  // Dev-only: devknobs emulates color scheme, motion, contrast, locale, geo and
  // layout from inside the page (⇧K toggles it), and grabs an element's context
  // for an agent (⇧G).
  void import("devknobs")
    .then(({ mount }) => mount())
    .catch((error: unknown) => console.warn("devknobs failed to load", error));
}
