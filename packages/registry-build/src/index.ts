import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

import { AUTHOR, ITEM_NAME } from "./names";

export { AUTHOR, ITEM_NAME, componentName } from "./names";

export const SCHEMA = "https://ui.shadcn.com/schema/registry-item.json";
export const BASE_URL = "https://vectoys.com/r";
const REACT = "@vinena/vectoys-react";

/** The items the index lists first, in this order; the rest follow in name order. */
export const FIRST = ["keyboard", "keycap"];

/** What `registry/<name>/item.json` holds. */
export type ItemSource = {
  name: string;
  title: string;
  description: string;
  files: string[];
  dependencies?: string[];
  /** Other items in this registry the item's code imports, as `@vectoys/<name>`, by their names. */
  registryDependencies?: string[];
  license: string;
  author?: string;
  credit?: string;
  docs?: string;
};

/** One item as served at `/r/<name>.json`, in the shadcn registry-item shape. */
export type RegistryItem = {
  $schema: string;
  name: string;
  type: "registry:component";
  title: string;
  description: string;
  author: string;
  /** Package specs, as `@vinena/vectoys-react@^0.3.0` for the repository's own packages. */
  dependencies: string[];
  /** The items this one imports, by the full URLs of their JSON, which `vectoys add` and the shadcn CLI add first. */
  registryDependencies?: string[];
  files: { path: string; type: "registry:component"; target: string; content: string }[];
  meta: { license: string; source: string; credit: string };
  /** Printed by `vectoys add` after the install. */
  docs?: string;
};

/** One item as `/r/index.json` lists it, with its maker as "Name (url)" so the gallery can credit them. */
export type IndexEntry = Pick<RegistryItem, "name" | "title" | "description" | "type" | "author"> & { license: string; credit: string };

/** What `/r/index.json` holds. */
export type RegistryIndex = { name: string; homepage: string; items: IndexEntry[] };

type Options = {
  /** The repository root, with the items under `registry/`. */
  root: string;
  /** Where the JSON goes; emptied first so removed items do not linger. */
  out: string;
  /** The URL `out` is served at, written into each file's header. */
  baseUrl?: string;
};

export async function buildRegistry({ root, out, baseUrl = BASE_URL }: Options): Promise<RegistryIndex> {
  const names = (await readdir(join(root, "registry"), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(byPlace);
  const versions = await packageVersions(root);
  const sources = await Promise.all(names.map((dir) => readSource(root, dir)));
  checkDependencies(sources);
  const items = await Promise.all(sources.map((source) => readItem(root, source, baseUrl, versions)));

  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  for (const item of items) await writeJson(join(out, `${item.name}.json`), item);
  const index: RegistryIndex = {
    name: "vectoys",
    homepage: new URL(baseUrl).origin,
    items: items.map(({ name, title, description, type, author, meta }) => ({ name, title, description, type, author, license: meta.license, credit: meta.credit })),
  };
  await writeJson(join(out, "index.json"), index);
  return index;
}

/** The packages under packages/ that items depend on, by name, each with a caret range from its version; none for a root without them. */
async function packageVersions(root: string): Promise<Map<string, string>> {
  const versions = new Map<string, string>();
  for (const dir of ["engine", "react"]) {
    const path = join(root, "packages", dir, "package.json");
    const pkg: { name?: unknown; version?: unknown } = await readFile(path, "utf8").then(JSON.parse, (error: NodeJS.ErrnoException) => {
      // Only a missing file means no package here; any other failure is a real one.
      if (error.code === "ENOENT") return {};
      throw error;
    });
    if (typeof pkg.name === "string" && typeof pkg.version === "string") versions.set(pkg.name, `^${pkg.version}`);
  }
  return versions;
}

/** Orders folder names: those in FIRST by their place there, then the rest by name. */
function byPlace(a: string, b: string) {
  const place = (name: string) => (FIRST.includes(name) ? FIRST.indexOf(name) : FIRST.length);
  return place(a) - place(b) || a.localeCompare(b);
}

async function readSource(root: string, dir: string): Promise<ItemSource> {
  const file = `registry/${dir}/item.json`;
  const source = checkItem(JSON.parse(await readFile(join(root, file), "utf8")), file);
  // The site finds an item's code by its folder, so the two names must match.
  if (source.name !== dir) throw new Error(`${file} "name" must be "${dir}", the name of its folder`);
  return source;
}

/** Fails unless every item's registryDependencies name other items here, with no item reaching itself through them. */
export function checkDependencies(sources: ItemSource[]) {
  const byName = new Map(sources.map((source) => [source.name, source]));
  for (const source of sources) {
    for (const dep of source.registryDependencies ?? []) {
      if (dep === source.name) throw new Error(`registry/${source.name}/item.json lists itself in "registryDependencies"`);
      if (!byName.has(dep)) throw new Error(`registry/${source.name}/item.json depends on "${dep}", which is not an item under registry/`);
    }
  }
  // A walk down each item's dependencies; meeting an item already on the path is a cycle.
  const walk = (name: string, path: string[]) => {
    if (path.includes(name)) throw new Error(`registry dependencies go round in a cycle: ${[...path.slice(path.indexOf(name)), name].join(" -> ")}`);
    for (const dep of byName.get(name)?.registryDependencies ?? []) walk(dep, [...path, name]);
  };
  for (const source of sources) walk(source.name, []);
}

// An import of another item, as the workspace names it: `from "@vectoys/laptop"`.
const ITEM_IMPORT = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])@vectoys\/([^"'\n]*)\2/g;

/**
 * `content` with each import of another item, `@vectoys/<dep>`, pointing at
 * the file that exports its component where the CLIs install it,
 * `../<dep>/<dep>`, as every item lands in its own folder side by side.
 * Fails on an item `dependencies` does not list.
 */
export function rewriteItemImports(content: string, file: string, dependencies: readonly string[]): string {
  return content.replace(ITEM_IMPORT, (_, before: string, quote: string, name: string) => {
    if (!dependencies.includes(name)) throw new Error(`${file} imports @vectoys/${name}, but item.json's "registryDependencies" do not list "${name}"`);
    return `${before}${quote}../${name}/${name}${quote}`;
  });
}

async function readItem(root: string, source: ItemSource, baseUrl: string, versions: Map<string, string>): Promise<RegistryItem> {
  const dir = source.name;
  const url = `${baseUrl}/${source.name}.json`;
  const credit = source.credit ?? AUTHOR;
  const files = await Promise.all(
    source.files.map(async (file) => {
      const content = rewriteItemImports(await readFile(join(root, "registry", dir, file), "utf8"), `registry/${dir}/${file}`, source.registryDependencies ?? []);
      return {
        path: `registry/${dir}/${file}`,
        type: "registry:component" as const,
        // The shadcn CLI puts each item in its own folder, as `vectoys add` does.
        target: `@components/vectoys/${source.name}/${file.replace(/^src\//, "")}`,
        content: header(file, [`vectoys ${source.name}, from ${url}`, `License: ${source.license}. Credit: ${credit}`]) + content,
      };
    }),
  );
  const dependencies = (source.dependencies ?? []).map((name) => (versions.has(name) ? `${name}@${versions.get(name)}` : name));
  // CLIs before 0.3 skip a package the project lists at any version, so the item says what it needs.
  const react = versions.get(REACT);
  const needs = react && source.dependencies?.includes(REACT) ? `This toy needs ${REACT} ${react.slice(1)} or newer. If your project has an older one, run: npm install ${REACT}@latest` : undefined;
  // CLIs before 0.3.1 skip registryDependencies, so the item names what to add in words too.
  const uses = (source.registryDependencies ?? []).map(usesLine);
  const docs = [source.docs, ...uses, needs].filter(Boolean).join("\n") || undefined;
  const registryDependencies = (source.registryDependencies ?? []).map((name) => `${baseUrl}/${name}.json`);
  return {
    $schema: SCHEMA,
    name: source.name,
    type: "registry:component",
    title: source.title,
    description: source.description,
    author: source.author ?? AUTHOR,
    // A range, so an install upgrades a project whose copy is too old for the item's code.
    dependencies,
    ...(registryDependencies.length ? { registryDependencies } : {}),
    files,
    meta: { license: source.license, source: url, credit },
    ...(docs ? { docs } : {}),
  };
}

/** The line an item's docs carry for each item it uses, which `vectoys add` leaves out once it added that item. */
export const usesLine = (name: string) => `This toy uses the ${name} toy. If your CLI did not add it, run: npx @vinena/vectoys-cli@latest add ${name}`;

/** An item.json's contents as an ItemSource, or an error naming `file` and the first field it lacks. */
export function checkItem(value: unknown, file: string): ItemSource {
  const item = value as Partial<ItemSource>;
  for (const key of ["name", "title", "description", "license"] as const) {
    if (typeof item[key] !== "string" || item[key] === "") throw new Error(`${file} needs a "${key}"`);
  }
  if (!Array.isArray(item.files) || item.files.length === 0) throw new Error(`${file} needs "files"`);
  if (item.author !== undefined && !isOneLine(item.author)) throw new Error(`${file} "author" must be one line of text like "Name (https://site)"`);
  if (item.credit !== undefined && !isOneLine(item.credit)) throw new Error(`${file} "credit" must be one line of text`);
  if (item.docs !== undefined && typeof item.docs !== "string") throw new Error(`${file} "docs" must be text`);
  const deps = item.registryDependencies;
  if (deps !== undefined && !(Array.isArray(deps) && deps.every((name) => typeof name === "string" && ITEM_NAME.test(name)))) {
    throw new Error(`${file} "registryDependencies" must be a list of item names`);
  }
  return item as ItemSource;
}

/** Text that fits in one line of a file's header comment: not blank, no line breaks, no end of a comment. */
const isOneLine = (value: unknown) => typeof value === "string" && value.trim() !== "" && !/[\r\n\u2028\u2029]/.test(value) && !value.includes("*/");

/** A comment to put on top of a copied file, in the file's own syntax; none for JSON. */
export function header(file: string, lines: string[]): string {
  const ext = extname(file);
  if (ext === ".json") return "";
  if (ext === ".css") return `/*\n${lines.map((line) => ` * ${line}`).join("\n")}\n */\n`;
  return lines.map((line) => `// ${line}\n`).join("");
}

async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}
