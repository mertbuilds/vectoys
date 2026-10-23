import { expect, test } from "bun:test";
import { parseArgs } from "../src/args";

test("commands, items and flags", () => {
  const args = parseArgs(["add", "phone", "@acme/thing", "--no-install", "-y", "--registry=http://x/r", "--cwd", "app"]);
  expect(args.command).toBe("add");
  expect(args.rest).toEqual(["phone", "@acme/thing"]);
  expect(args.flags).toMatchObject({ install: false, yes: true, overwrite: false, registry: "http://x/r", cwd: "app" });
});

test("create takes the folder to put the item under", () => {
  const args = parseArgs(["create", "top", "--dir", "registry", "-o"]);
  expect(args.rest).toEqual(["top"]);
  expect(args.flags).toMatchObject({ dir: "registry", overwrite: true, cwd: undefined });
  expect(parseArgs(["create", "top", "--dir=registry"]).flags.dir).toBe("registry");
});

test("bad flags say what is wrong", () => {
  expect(() => parseArgs(["add", "--registry"])).toThrow("--registry needs a value.");
  expect(() => parseArgs(["add", "--force"])).toThrow("Unknown option --force.");
});

test("preview opens and submit dry runs", () => {
  expect(parseArgs(["preview", "top", "--open"]).flags).toMatchObject({ open: true, dryRun: false });
  expect(parseArgs(["submit", "--dry-run", "--registry", "https://acme.dev/r"]).flags).toMatchObject({ open: false, dryRun: true, registry: "https://acme.dev/r" });
});
