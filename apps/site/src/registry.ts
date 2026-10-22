/** One item as `/r/index.json` lists it. */
export type Entry = { name: string; title: string; description: string; license: string };

/** What `/r/index.json` holds. */
export type RegistryIndex = { name: string; homepage: string; items: Entry[] };

/** The id of the script tag the prerendered page carries the index in, so hydration draws the same gallery. */
export const INDEX_DATA = "registry-index";

export const REPO = "https://github.com/mertbuilds/vectoys";

export const addCommand = (name: string) => `npx vectoys add ${name}`;
