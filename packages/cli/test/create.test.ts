import { afterAll, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { checkItem } from "@vectoys/registry-build";
import { compilerOptions } from "../../../tsconfig.base.json";
import { version } from "../package.json";
import type { Context } from "../src/commands";
import { componentName, create, inVectoysRepo } from "../src/create";

const repo = resolve(import.meta.dir, "../../..");
const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

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
    license: "MIT",
  });
  for (const file of ["package.json", "tsconfig.json", "src/index.ts", "test/spinning-top.test.tsx"]) expect(existsSync(join(folder, file))).toBe(true);
  expect(readFileSync(join(folder, "src/spinning-top.tsx"), "utf8")).toContain("export function SpinningTop(");
  expect(lines.at(-1)).toBe('Draw it in spinning-top/src, then run "vectoys check spinning-top" before you submit it.');
});

test("create puts the folder under --dir", () => {
  create(context().context, "slab", "registry");
  expect(existsSync(join(work, "registry/slab/item.json"))).toBe(true);
});

test("outside a vectoys checkout, create writes version ranges and a tsconfig of its own", () => {
  create(context().context, "standalone", undefined);
  const folder = join(work, "standalone");
  expect(readJson(join(folder, "package.json"))).toMatchObject({
    dependencies: { "@vectoys/engine": `^${version}`, "@vectoys/react": `^${version}` },
    devDependencies: { "@types/bun": expect.any(String) },
  });
  expect(readJson(join(folder, "tsconfig.json"))).toEqual({ compilerOptions: { ...compilerOptions, jsx: "react-jsx" }, include: ["src", "test"] });
});

test("under registry/ of a vectoys checkout, create keeps the workspace's packages and base tsconfig", () => {
  const checkout = join(work, "checkout");
  mkdirSync(join(checkout, "registry"), { recursive: true });
  writeFileSync(join(checkout, "package.json"), JSON.stringify({ name: "vectoys-workspace" }));
  create({ ...context().context, cwd: checkout }, "linked", "registry");
  const folder = join(checkout, "registry/linked");
  const pkg = readJson(join(folder, "package.json"));
  expect(pkg).toMatchObject({ dependencies: { "@vectoys/engine": "workspace:*", "@vectoys/react": "workspace:*" } });
  expect(JSON.stringify(pkg)).not.toContain("@types/bun");
  expect(readJson(join(folder, "tsconfig.json"))).toEqual(readJson(join(repo, "registry/floppy/tsconfig.json")));
  expect(inVectoysRepo(join(checkout, "elsewhere/linked"))).toBe(false);
  expect(inVectoysRepo(join(repo, "registry/new"))).toBe(true);
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
