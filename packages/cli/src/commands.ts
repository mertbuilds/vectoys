import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { CONFIG_FILE, DEFAULT_REGISTRY, defaults, readConfig, writeConfig, type Config } from "./config";
import { fetchJson } from "./fetch";
import { place, type ItemFile } from "./files";
import { detect, installCommand, missing } from "./pm";
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

type Item = { name: string; title?: string; dependencies?: string[]; files: ItemFile[]; docs?: string };
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
  const config = readConfig(context.cwd) ?? init(context);
  const dependencies = new Set<string>();
  for (const spec of specs) {
    const url = itemUrl(spec, config, context.registry);
    const item = check(await fetchJson<unknown>(url), url);
    const root = resolve(context.cwd, config.dir);
    const folder = resolve(root, item.name);
    for (const file of place(item.files)) {
      const path = resolve(folder, file.to);
      if (!folder.startsWith(root + sep) || !path.startsWith(folder + sep)) throw new Error(`${url} has a file that would land outside ${config.dir}.`);
      await write(context, path, file.content);
    }
    for (const dependency of item.dependencies ?? []) dependencies.add(dependency);
    if (item.docs) context.log(item.docs);
  }
  installMissing(context, [...dependencies]);
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

function check(value: unknown, url: string): Item {
  const item = value as Partial<Item>;
  const fine =
    typeof item.name === "string" &&
    /^(?!\.{1,2}$)[\w.-]+$/.test(item.name) &&
    Array.isArray(item.files) &&
    item.files.every((file) => typeof file?.path === "string" && typeof file.content === "string");
  if (!fine) throw new Error(`${url} is not a registry item with a name and files that have content.`);
  return item as Item;
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
  const result = spawnSync(command, args, { cwd: context.cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) throw new Error(`"${line}" failed. Run it yourself to see why.`);
}
