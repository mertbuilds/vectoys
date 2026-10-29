import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const site = resolve(import.meta.dir, "..");
const html = readFileSync(resolve(site, "index.html"), "utf8");

test("the home head has a 50 to 60 character title, a 120 to 160 character description and a canonical", () => {
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? "";
  const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? "";
  expect(title.length).toBeGreaterThanOrEqual(50);
  expect(title.length).toBeLessThanOrEqual(60);
  expect(description.length).toBeGreaterThanOrEqual(120);
  expect(description.length).toBeLessThanOrEqual(160);
  expect(html).toContain('<link rel="canonical" href="https://vectoys.com/" />');
});

test("the JSON-LD graph names the publisher, the website and the source code", () => {
  const json = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1] ?? "";
  const graph: { "@type": string; [key: string]: unknown }[] = JSON.parse(json)["@graph"];
  expect(graph.map((node) => node["@type"])).toEqual(["Organization", "WebSite", "SoftwareSourceCode"]);
  expect(graph[0]).toMatchObject({ name: "Vinena Studio", url: "https://vinena.studio" });
  expect(graph[2]).toMatchObject({ codeRepository: "https://github.com/vinenastudio/vectoys", programmingLanguage: "TypeScript" });
});

test("robots.txt points to a sitemap of every public page", () => {
  expect(readFileSync(resolve(site, "public/robots.txt"), "utf8")).toContain("Sitemap: https://vectoys.com/sitemap.xml");
  const sitemap = readFileSync(resolve(site, "public/sitemap.xml"), "utf8");
  for (const url of ["https://vectoys.com/", "https://vectoys.com/toys"]) expect(sitemap).toContain(`<loc>${url}</loc>`);
});
