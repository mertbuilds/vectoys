import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const CONFIG_FILE = "vectoys.json";
export const DEFAULT_REGISTRY = "https://vectoys.com/r";

/** What `vectoys.json` holds. */
export type Config = {
  /** Where items are copied, from the project root; each item gets its own folder. */
  dir: string;
  /** The registry plain names like `phone` come from. */
  registry: string;
  /** Other registries by scope, as `{ "@acme": "https://acme.dev/r" }`. */
  registries: Record<string, string>;
};

export function defaults(cwd: string, registry = DEFAULT_REGISTRY): Config {
  const dir = existsSync(join(cwd, "src")) ? "src/components/vectoys" : "components/vectoys";
  return { dir, registry, registries: {} };
}

export function readConfig(cwd: string): Config | undefined {
  const path = join(cwd, CONFIG_FILE);
  if (!existsSync(path)) return undefined;
  let value: Partial<Config>;
  try {
    value = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(`${CONFIG_FILE} is not valid JSON. Fix it or delete it and run "vectoys init".`);
  }
  const fallback = defaults(cwd);
  return {
    dir: typeof value.dir === "string" ? value.dir : fallback.dir,
    registry: typeof value.registry === "string" ? value.registry : fallback.registry,
    registries: value.registries && typeof value.registries === "object" ? value.registries : {},
  };
}

export function writeConfig(cwd: string, config: Config) {
  writeFileSync(join(cwd, CONFIG_FILE), `${JSON.stringify(config, null, 2)}\n`);
}
