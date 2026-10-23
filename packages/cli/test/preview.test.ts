import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Context } from "../src/commands";
import { create } from "../src/create";
import { preview, previewPage } from "../src/preview";

const repo = resolve(import.meta.dir, "../../..");
const work = mkdtempSync(join(tmpdir(), "vectoys-preview-test-"));
symlinkSync(join(repo, "registry/floppy/node_modules"), join(work, "node_modules"));
afterAll(() => rmSync(work, { recursive: true, force: true }));

const quiet: Context = { cwd: work, registry: undefined, registryFlag: undefined, yes: false, overwrite: false, install: false, log: () => {} };

test("preview writes preview.html with light and dark panels and the item at each yaw", () => {
  create(quiet, "plate", undefined);
  const lines: string[] = [];
  const path = preview({ ...quiet, log: (line) => lines.push(line) }, "plate");
  expect(path).toBe(join(work, "plate/preview.html"));
  expect(lines).toEqual([path]);
  const html = readFileSync(path, "utf8");
  expect(html).toStartWith("<!doctype html>");
  expect(html).toContain('<section class="light">');
  expect(html).toContain('<section class="dark">');
  for (const yaw of [-45, -20, 0, 20, 45]) expect(html).toContain(`<figcaption>yaw ${yaw}</figcaption>`);
  expect(html.match(/role="img" aria-label="Plate"/g)?.length).toBe(12);
  expect(readFileSync(join(work, "plate/.gitignore"), "utf8")).toBe("preview.html\n");
}, 30_000);

test("an item that does not turn shows only as it comes", () => {
  const html = previewPage("Still", { name: "Still", html: '<svg><linearGradient id="g"></linearGradient><path fill="url(#g)"/></svg>', yaws: [] });
  expect(html).not.toContain("yaw");
  expect(html).toContain('id="light-g"');
  expect(html).toContain('fill="url(#dark-g)"');
});

test("preview fails on a folder that is not an item", () => {
  expect(() => preview(quiet, ".")).toThrow(". is not an item to preview: there is no item.json.");
});
