import { readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { RegistryIndex } from "../src/registry";
import { INDEX_DATA } from "../src/registry";

// Draws the built page into dist/index.html, so every device on it is in the
// HTML before any script runs, then drops the server build.
const dist = resolve(import.meta.dir, "../dist");
const server = join(dist, ".server");
const { render }: { render: (index: RegistryIndex) => string } = await import(join(server, "entry-server.js"));

const index: RegistryIndex = JSON.parse(await readFile(join(dist, "r/index.json"), "utf8"));
const page = join(dist, "index.html");
const template = await readFile(page, "utf8");
const data = JSON.stringify(index).replace(/</g, "\\u003c");
// A function, so a "$" in the page or the data is written as it is, not read as a pattern.
const html = template.replace('<div id="root"></div>', () => `<div id="root">${render(index)}</div><script type="application/json" id="${INDEX_DATA}">${data}</script>`);
if (html === template) throw new Error('dist/index.html has no <div id="root"></div> to draw into');

await writeFile(page, html);
await rm(server, { recursive: true, force: true });
console.log(`Drew the page with ${index.items.length} items into ${page}`);
