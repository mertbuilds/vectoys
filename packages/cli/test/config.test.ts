import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONFIG_FILE, defaults, readConfig, writeConfig } from "../src/config";
import { detect, installCommand, missing } from "../src/pm";

let dir = "";
afterEach(() => rmSync(dir, { recursive: true, force: true }));
const fresh = () => (dir = mkdtempSync(join(tmpdir(), "vectoys-config-")));

test("items go under src when the project has one", () => {
  fresh();
  expect(defaults(dir).dir).toBe("components/vectoys");
  mkdirSync(join(dir, "src"));
  expect(defaults(dir)).toEqual({ dir: "src/components/vectoys", registry: "https://vectoys.com/r", registries: {} });
});

test("a config written is the config read", () => {
  fresh();
  expect(readConfig(dir)).toBeUndefined();
  const config = { dir: "app/toys", registry: "http://localhost:4000/r", registries: { "@acme": "https://acme.dev/r" } };
  writeConfig(dir, config);
  expect(readConfig(dir)).toEqual(config);
  expect(readFileSync(join(dir, CONFIG_FILE), "utf8")).toEndWith("}\n");
});

test("missing fields fall back to the defaults, and broken JSON says so", () => {
  fresh();
  writeFileSync(join(dir, CONFIG_FILE), JSON.stringify({ registries: { "@acme": "https://acme.dev/r" } }));
  expect(readConfig(dir)).toEqual({ dir: "components/vectoys", registry: "https://vectoys.com/r", registries: { "@acme": "https://acme.dev/r" } });
  writeFileSync(join(dir, CONFIG_FILE), "{");
  expect(() => readConfig(dir)).toThrow("vectoys.json is not valid JSON");
});

test("the package manager comes from the lockfile", () => {
  fresh();
  expect(detect(dir)).toBe("npm");
  writeFileSync(join(dir, "pnpm-lock.yaml"), "");
  expect(detect(dir)).toBe("pnpm");
  writeFileSync(join(dir, "bun.lock"), "");
  expect(detect(dir)).toBe("bun");
  expect(installCommand("npm", ["a"])).toEqual(["npm", ["install", "a"]]);
  expect(installCommand("yarn", ["a", "b"])).toEqual(["yarn", ["add", "a", "b"]]);
});

test("only packages the project does not list are installed", () => {
  fresh();
  writeFileSync(join(dir, "package.json"), JSON.stringify({ dependencies: { "@vectoys/engine": "0.1.0" }, devDependencies: { left: "1" } }));
  expect(missing(dir, ["@vectoys/engine", "@vectoys/react@0.1.0", "left@^2", "right"])).toEqual(["@vectoys/react@0.1.0", "right"]);
});
