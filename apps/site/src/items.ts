import type { ComponentType } from "react";
import { LaptopPreview } from "./previews/laptop";
import { PhonePreview } from "./previews/phone";
import { TabletPreview } from "./previews/tablet";

/**
 * The live preview on each gallery card, by the item's name in `/r/index.json`.
 * Add a line here when an item merges; an item in the index without one shows
 * a placeholder until it has.
 */
export const PREVIEWS: Readonly<Record<string, ComponentType>> = {
  "laptop-14": LaptopPreview,
  phone: PhonePreview,
  tablet: TabletPreview,
};
