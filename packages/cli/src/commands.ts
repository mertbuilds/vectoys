import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, posix, relative, resolve, sep } from "node:path";
import { ITEM_NAME, usesLine } from "@vectoys/registry-build";
import { CONFIG_FILE, DEFAULT_REGISTRY, defaults, readConfig, writeConfig, type Config } from "./config";
import { fetchJson } from "./fetch";
import { place, type ItemFile } from "./files";
import { importExtension, withExtensions } from "./imports";
import { detect, installCommand, isPackageSpec, missing } from "./pm";
import { confirm } from "./prompt";
import { indexUrl, itemUrl } from "./resolve";

export type Context = {
  cwd: string;
  /** The registry for plain names when `--registry` or VECTOYS_REGISTRY sets one. */
  registry: string | undefined;
  /** Only `--registry` is written to a new vectoys.json; the variable is for one shell. */
  registryFlag: string | undefined;
  yes: boolean;
  overwrite: boolean;
  install: boolean;
  log: (line: string) => void;
};

export { ITEM_NAME };

/** How deep `add` follows items that depend on items, so a registry cannot send it on forever. */
export const MAX_DEPTH = 8;

type Item = { name: string; title?: string; dependencies?: string[]; registryDependencies?: string[]; files: ItemFile[]; docs?: string };
type Fetched = { url: string; item: Item };
type Index = { items: { name: string; title?: string; description?: string; license?: string }[] };

export function init(context: Context): Config {
  const found = readConfig(context.cwd);
  if (found) {
    context.log(`${CONFIG_FILE} is already here. Items go to ${found.dir}.`);
    return found;
  }
  const config = defaults(context.cwd, context.registryFlag ?? DEFAULT_REGISTRY);
  writeConfig(context.cwd, config);
  context.log(`Wrote ${CONFIG_FILE}. Items go to ${config.dir}, from ${config.registry}.`);
  context.log(`Packages install with ${detect(context.cwd)}.`);
  return config;
}

export async function add(context: Context, specs: string[]) {
  if (specs.length === 0) throw new Error('Name an item to add, as "vectoys add phone". Run "vectoys list" to see them.');
  const found = readConfig(context.cwd);
  const config = found ?? defaults(context.cwd, context.registryFlag ?? DEFAULT_REGISTRY);
  // Every item and every item it depends on is fetched and checked before
  // anything is written, so one bad name leaves the project as it was.
  const urlOf = (spec: string) => itemUrl(spec, config, context.registry);
  const items = await withDependencies(specs.map(urlOf), urlOf);
  const root = resolve(context.cwd, config.dir);
  // The items' files together, each under its item's folder, so an import of
  // another item, `../laptop/laptop`, gets its extension as one of its own does.
  const placed = items.flatMap(({ url, item }) => place(item.files).map((file) => ({ url, folder: resolve(root, item.name), file: { ...file, to: posix.join(item.name, file.to) } })));
  const named = withExtensions(placed.map(({ file }) => file), importExtension(context.cwd));
  const writes = placed.map(({ url, folder }, at) => {
    const file = named[at]!;
    const path = resolve(root, file.to);
    if (!folder.startsWith(root + sep) || !path.startsWith(folder + sep)) throw new Error(`${url} has a file that would land outside ${config.dir}.`);
    return { path, content: file.content };
  });

  if (!found) init(context);
  for (const { path, content } of writes) await write(context, path, content);
  // Each line once, and none that asks to add an item this add just wrote.
  const added = new Set(items.map(({ item }) => usesLine(item.name)));
  for (const line of new Set(items.flatMap(({ item }) => item.docs?.split("\n") ?? []))) if (!added.has(line)) context.log(line);
  installMissing(context, [...new Set(items.flatMap(({ item }) => item.dependencies ?? []))]);
}

export async function list(context: Context, scope: string | undefined) {
  const config = readConfig(context.cwd) ?? defaults(context.cwd);
  // A URL names a registry outright; a scope looks one up in vectoys.json.
  const url = scope && /^https?:\/\//.test(scope) ? indexUrl(undefined, config, scope) : indexUrl(scope, config, scope ? undefined : context.registry);
  const index = await fetchJson<Index>(url);
  if (!Array.isArray(index.items) || index.items.length === 0) {
    context.log(`${url} lists no items.`);
    return;
  }
  const width = Math.max(...index.items.map((item) => item.name.length));
  const prefix = scope?.startsWith("@") ? `${scope}/` : "";
  for (const item of index.items) {
    const license = item.license ? ` (license: ${item.license})` : "";
    context.log(`${(prefix + item.name).padEnd(width + prefix.length)}  ${item.title ?? ""}${license}`);
  }
}

/**
 * The items at `urls` and the items they list in registryDependencies, by
 * `urlOf` for a plain name, fetched and checked, each once: the ones
 * depended on before the ones that use them.
 */
export async function withDependencies(urls: string[], urlOf: (spec: string) => string): Promise<Fetched[]> {
  const fetched = new Map<string, Promise<Item>>();
  const get = (url: string) => {
    if (!fetched.has(url)) fetched.set(url, fetchJson<unknown>(url).then((value) => check(value, url)));
    return fetched.get(url)!;
  };
  // The ones asked for are fetched together; the rest as the walk meets them.
  await Promise.all(urls.map(get));
  const ordered: Fetched[] = [];
  const visit = async (url: string, path: string[]) => {
    if (path.includes(url)) throw new Error(`${url} depends on itself: ${[...path.slice(path.indexOf(url)), url].join(" -> ")}`);
    if (path.length >= MAX_DEPTH) throw new Error(`${path[0]} depends on items more than ${MAX_DEPTH} deep.`);
    if (ordered.some((each) => each.url === url)) return;
    const item = await get(url);
    for (const dep of item.registryDependencies ?? []) await visit(/^https?:\/\//.test(dep) ? dep : urlOf(dep), [...path, url]);
    if (!ordered.some((each) => each.url === url)) ordered.push({ url, item });
  };
  for (const url of urls) await visit(url, []);
  // Each item lands in a folder named after it, so two by one name would write over each other.
  for (const [at, { url, item }] of ordered.entries()) {
    const other = ordered.slice(0, at).find((each) => each.item.name === item.name);
    if (other) throw new Error(`${url} and ${other.url} are both named "${item.name}".`);
  }
  return ordered;
}

function check(value: unknown, url: string): Item {
  const item = value as Partial<Item>;
  const fine =
    typeof item.name === "string" &&
    ITEM_NAME.test(item.name) &&
    Array.isArray(item.files) &&
    item.files.every((file) => typeof file?.path === "string" && typeof file.content === "string");
  if (!fine) throw new Error(`${url} is not a registry item with a name and files that have content.`);
  if (item.dependencies !== undefined && !(Array.isArray(item.dependencies) && item.dependencies.every(isPackageSpec))) {
    throw new Error(`${url} lists dependencies that are not plain npm package names.`);
  }
  const registryDependencies = item.registryDependencies;
  if (registryDependencies !== undefined && !(Array.isArray(registryDependencies) && registryDependencies.every(isItemRef))) {
    throw new Error(`${url} lists registryDependencies that are not item names or http(s) URLs.`);
  }
  return item as Item;
}

/** Whether a registryDependencies entry is a plain item name or an http or https URL. */
function isItemRef(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (ITEM_NAME.test(value)) return true;
  if (!/^https?:\/\//.test(value)) return false;
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
}

async function write(context: Context, path: string, content: string) {
  const shown = relative(context.cwd, path);
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") === content) {
      context.log(`Same     ${shown}`);
      return;
    }
    const replace = context.overwrite || context.yes || (process.stdin.isTTY && (await confirm(`${shown} is already there. Replace it?`)));
    if (!replace) {
      context.log(`Kept     ${shown} (pass --overwrite to replace it)`);
      return;
    }
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  context.log(`Wrote    ${shown}`);
}

function installMissing(context: Context, dependencies: string[]) {
  const needed = missing(context.cwd, dependencies);
  if (needed.length === 0) return;
  const [command, args] = installCommand(detect(context.cwd), needed);
  const line = [command, ...args].join(" ");
  if (!context.install) {
    context.log(`Install what the items need with: ${line}`);
    return;
  }
  context.log(`Running  ${line}`);
  // Windows runs package managers through cmd, which needs the shell; the
  // specs are checked, and quoting keeps characters like ^ as they are.
  const windows = process.platform === "win32";
  const result = spawnSync(command, windows ? args.map((arg) => `"${arg}"`) : args, { cwd: context.cwd, stdio: "inherit", shell: windows });
  if (result.status !== 0) throw new Error(`"${line}" failed. Run it yourself to see why.`);
}
