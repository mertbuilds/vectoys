import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type PackageManager = "bun" | "pnpm" | "yarn" | "npm";

const LOCKFILES: [string, PackageManager][] = [
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
];

/** The package manager whose lockfile the project has, npm if none. */
export function detect(cwd: string): PackageManager {
  return LOCKFILES.find(([file]) => existsSync(join(cwd, file)))?.[1] ?? "npm";
}

export function installCommand(pm: PackageManager, packages: string[]): [string, string[]] {
  return [pm, [pm === "npm" ? "install" : "add", ...packages]];
}

/** The packages from `wanted` the project's package.json does not list yet. */
export function missing(cwd: string, wanted: string[]): string[] {
  const path = join(cwd, "package.json");
  if (!existsSync(path)) return wanted;
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  const have = new Set(
    ["dependencies", "devDependencies", "peerDependencies"].flatMap((field) => Object.keys(pkg[field] ?? {})),
  );
  return wanted.filter((spec) => !have.has(packageName(spec)));
}

// "@scope/name@1.2.0" is "@scope/name", "name@^1" is "name".
function packageName(spec: string): string {
  const at = spec.indexOf("@", 1);
  return at === -1 ? spec : spec.slice(0, at);
}
