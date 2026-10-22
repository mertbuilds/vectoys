import { afterAll, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkItem } from "@vectoys/registry-build";
import type { Context } from "../src/commands";
import { componentName, create } from "../src/create";

const work = mkdtempSync(join(tmpdir(), "vectoys-create-"));
afterAll(() => rmSync(work, { recursive: true, force: true }));

const context = (overwrite = false) => {
  const lines: string[] = [];
  const given: Context = { cwd: work, registry: undefined, registryFlag: undefined, yes: false, overwrite, install: false, log: (line) => lines.push(line) };
  return { context: given, lines };
};

test("create writes an item folder like the registry's own", () => {
  const { context: here, lines } = context();
  create(here, "spinning-top", undefined);
  const folder = join(work, "spinning-top");
  const item = checkItem(JSON.parse(readFileSync(join(folder, "item.json"), "utf8")), "item.json");
  expect(item).toMatchObject({
    name: "spinning-top",
    title: "Spinning top",
    files: ["src/geometry.ts", "src/spinning-top.tsx"],
    dependencies: ["@vectoys/engine", "@vectoys/react"],
    license: "TBD",
  });
  for (const file of ["package.json", "tsconfig.json", "src/index.ts", "test/spinning-top.test.tsx"]) expect(existsSync(join(folder, file))).toBe(true);
  expect(readFileSync(join(folder, "src/spinning-top.tsx"), "utf8")).toContain("export function SpinningTop(");
  expect(lines.at(-1)).toBe('Draw it in spinning-top/src, then run "vectoys check spinning-top" before you submit it.');
});

test("create puts the folder under --dir", () => {
  create(context().context, "slab", "registry");
  expect(existsSync(join(work, "registry/slab/item.json"))).toBe(true);
});

test("create turns away bad names and an existing folder unless told to overwrite", () => {
  const { context: here } = context();
  expect(() => create(here, undefined, undefined)).toThrow("Name the new item");
  for (const name of ["..", "a/b", "my toy"]) expect(() => create(here, name, undefined)).toThrow("is not an item name");
  writeFileSync(join(work, "spinning-top/item.json"), "{}");
  expect(() => create(here, "spinning-top", undefined)).toThrow("spinning-top is already there. Pass --overwrite to write over it.");
  create(context(true).context, "spinning-top", undefined);
  expect(readFileSync(join(work, "spinning-top/item.json"), "utf8")).toContain('"name": "spinning-top"');
});

test("component names are identifiers", () => {
  expect(componentName("spinning-top")).toBe("SpinningTop");
  expect(componentName("toy.box_two")).toBe("ToyBoxTwo");
  expect(componentName("3d-box")).toBe("Item3dBox");
});
