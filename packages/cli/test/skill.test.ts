import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Context } from "../src/commands";
import { SKILL, skill } from "../src/skill";

test("skill prints SKILL.md from the package folder", () => {
  expect(SKILL).toBe(join(import.meta.dir, "../SKILL.md"));
  const work = mkdtempSync(join(tmpdir(), "vectoys-skill-"));
  const lines: string[] = [];
  const context: Context = { cwd: work, registry: undefined, registryFlag: undefined, yes: false, overwrite: false, install: false, log: (line) => lines.push(line) };
  try {
    writeFileSync(join(work, "SKILL.md"), "# Make an item\n\nRun vectoys create.\n");
    skill(context, join(work, "SKILL.md"));
    expect(lines).toEqual(["# Make an item\n\nRun vectoys create."]);
    expect(() => skill(context, join(work, "gone.md"))).toThrow("gone.md is missing. Reinstall vectoys.");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
