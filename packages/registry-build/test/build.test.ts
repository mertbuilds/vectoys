import { afterAll, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { SCHEMA, buildRegistry, header, type RegistryIndex, type RegistryItem } from "../src";

const root = resolve(import.meta.dir, "../../..");
const out = await mkdtemp(join(tmpdir(), "vectoys-registry-"));
afterAll(() => rm(out, { recursive: true, force: true }));

test("writes an index and one shadcn registry item per device", async () => {
  await buildRegistry({ root, out, baseUrl: "https://example.test/r" });
  const index: RegistryIndex = JSON.parse(await readFile(join(out, "index.json"), "utf8"));
  const dirs = (await readdir(join(root, "registry"), { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  expect(index.items.map((item) => item.name)).toEqual(dirs.sort());
  expect(index.items.map((item) => item.name)).toEqual(expect.arrayContaining(["laptop-14", "phone", "tablet", "card", "dice", "gift"]));
  expect(index.items.find((item) => item.name === "phone")).toMatchObject({ name: "phone", title: "Phone", type: "registry:component", license: "TBD" });

  const phone: RegistryItem = JSON.parse(await readFile(join(out, "phone.json"), "utf8"));
  expect(phone).toMatchObject({
    $schema: SCHEMA,
    name: "phone",
    type: "registry:component",
    dependencies: ["@vectoys/engine", "@vectoys/react"],
    meta: { license: "TBD", source: "https://example.test/r/phone.json" },
  });
  expect(phone.files.map((file) => [file.path, file.target])).toEqual([
    ["registry/phone/src/geometry.ts", "@components/vectoys/phone/geometry.ts"],
    ["registry/phone/src/phone.tsx", "@components/vectoys/phone/phone.tsx"],
  ]);
});

test("each copied file starts with a short header over the untouched source", async () => {
  const laptop: RegistryItem = JSON.parse(await readFile(join(out, "laptop-14.json"), "utf8"));
  const geometry = laptop.files[0]!;
  const source = await readFile(join(root, "registry/laptop-14/src/geometry.ts"), "utf8");
  const lines = geometry.content.split("\n");
  expect(lines[0]).toBe("// vectoys laptop-14, from https://example.test/r/laptop-14.json");
  expect(lines[1]).toBe("// License: TBD. Credit: vectoys (https://vectoys.com)");
  expect(lines.slice(2).join("\n")).toBe(source);
});

test("headers follow the file's syntax", () => {
  expect(header("a.tsx", ["one"])).toBe("// one\n");
  expect(header("a.css", ["one", "two"])).toBe("/*\n * one\n * two\n */\n");
  expect(header("a.json", ["one"])).toBe("");
});
