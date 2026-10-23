import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Context } from "./commands";

/** SKILL.md, next to the package's dist and src folders. */
export const SKILL = fileURLToPath(new URL("../SKILL.md", import.meta.url));

/** Prints SKILL.md: how a coding agent makes, checks and submits a new item. */
export function skill(context: Context, path = SKILL) {
  if (!existsSync(path)) throw new Error(`${path} is missing. Reinstall vectoys.`);
  context.log(readFileSync(path, "utf8").trimEnd());
}
