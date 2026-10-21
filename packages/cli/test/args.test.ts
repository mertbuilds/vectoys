import { expect, test } from "bun:test";
import { parseArgs } from "../src/args";

test("commands, items and flags", () => {
  const args = parseArgs(["add", "phone", "@acme/thing", "--no-install", "-y", "--registry=http://x/r", "--cwd", "app"]);
  expect(args.command).toBe("add");
  expect(args.rest).toEqual(["phone", "@acme/thing"]);
  expect(args.flags).toMatchObject({ install: false, yes: true, overwrite: false, registry: "http://x/r", cwd: "app" });
});

test("bad flags say what is wrong", () => {
  expect(() => parseArgs(["add", "--registry"])).toThrow("--registry needs a value.");
  expect(() => parseArgs(["add", "--force"])).toThrow("Unknown option --force.");
});
