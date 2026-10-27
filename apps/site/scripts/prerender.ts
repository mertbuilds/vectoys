import { readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Page } from "../src/app";
import type { RegistryIndex } from "../src/registry";
import { INDEX_DATA } from "../src/registry";

// Draws each page into dist, so every device on it is in the HTML before any
// script runs, then drops the server build. The landing is dist/index.html and
// /toys is dist/toys.html (served at /toys with no redirect), both from the same template.
const dist = resolve(import.meta.dir, "../dist");
const server = join(dist, ".server");
const { render }: { render: (index: RegistryIndex, page: Page) => string } = await import(join(server, "entry-server.js"));

const index: RegistryIndex = JSON.parse(await readFile(join(dist, "r/index.json"), "utf8"));
const template = await readFile(join(dist, "index.html"), "utf8");
const data = JSON.stringify(index).replace(/</g, "\\u003c");

/** The template with its head changed for a page: each `[from, to]` must be in it. */
function withHead(html: string, swaps: [string, string][]) {
  return swaps.reduce((page, [from, to]) => {
    if (!page.includes(from)) throw new Error(`dist/index.html has no ${from} to change`);
    return page.split(from).join(to);
  }, html);
}

const TOYS_TITLE = "All toys | vectoys";
const TOYS_DESCRIPTION = `All ${index.items.length} vectoys devices and toys, live, each with its install command and its source.`;

const pages: { page: Page; file: string; head: [string, string][] }[] = [
  { page: "home", file: join(dist, "index.html"), head: [] },
  {
    page: "toys",
    file: join(dist, "toys.html"),
    head: [
      ["<title>vectoys</title>", `<title>${TOYS_TITLE}</title>`],
      ['href="https://vectoys.com/"', 'href="https://vectoys.com/toys"'],
      ['content="https://vectoys.com/"', 'content="https://vectoys.com/toys"'],
      ['property="og:title" content="vectoys"', `property="og:title" content="${TOYS_TITLE}"`],
      ['name="twitter:title" content="vectoys"', `name="twitter:title" content="${TOYS_TITLE}"`],
      [/<meta name="description" content="[^"]*"/.exec(template)?.[0] ?? "", `<meta name="description" content="${TOYS_DESCRIPTION}"`],
      [/<meta property="og:description" content="[^"]*"/.exec(template)?.[0] ?? "", `<meta property="og:description" content="${TOYS_DESCRIPTION}"`],
      [/<meta name="twitter:description" content="[^"]*"/.exec(template)?.[0] ?? "", `<meta name="twitter:description" content="${TOYS_DESCRIPTION}"`],
    ],
  },
];

for (const { page, file, head } of pages) {
  // A function, so a "$" in the page or the data is written as it is, not read as a pattern.
  const html = withHead(template, head).replace(
    '<div id="root"></div>',
    () => `<div id="root">${render(index, page)}</div><script type="application/json" id="${INDEX_DATA}">${data}</script>`,
  );
  if (!html.includes(`id="${INDEX_DATA}"`)) throw new Error('dist/index.html has no <div id="root"></div> to draw into');
  await writeFile(file, html);
  console.log(`Drew ${page} with ${index.items.length} items into ${file}`);
}
await rm(server, { recursive: true, force: true });
