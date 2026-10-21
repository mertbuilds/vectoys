import { expect, test } from "bun:test";
import { place, rewriteImports } from "../src/files";

test("files keep their places below the folder they share", () => {
  const placed = place([
    { path: "registry/phone/src/geometry.ts", content: "" },
    { path: "registry/phone/src/phone.tsx", content: 'import { seen } from "./geometry";' },
  ]);
  expect(placed.map((file) => file.to)).toEqual(["geometry.ts", "phone.tsx"]);
  expect(placed[1]!.content).toBe('import { seen } from "./geometry";');
  expect(place([{ path: "a/b/one.ts", content: "" }])[0]!.to).toBe("one.ts");
  expect(place([{ path: "a\\b\\one.ts", content: "" }, { path: "a/c/two.ts", content: "" }]).map((file) => file.to)).toEqual(["b/one.ts", "c/two.ts"]);
});

test("imports between files follow them when they move", () => {
  const moves = new Map([
    ["src/ui/phone.tsx", "phone.tsx"],
    ["src/lib/geometry.ts", "lib/geometry.ts"],
    ["src/lib/parts/index.ts", "lib/parts/index.ts"],
    ["src/lib/style.css", "style.css"],
  ]);
  const source = [
    'import { seen } from "../lib/geometry";',
    "import { a } from '../lib/geometry.ts';",
    'import { part } from "../lib/parts";',
    'import "../lib/style.css";',
    'const lazy = import("../lib/geometry");',
    'export { b } from "../lib/geometry";',
    'import { other } from "./not-in-the-item";',
    'import { fixed } from "@vectoys/engine";',
  ].join("\n");
  expect(rewriteImports(source, "src/ui/phone.tsx", moves)).toBe(
    [
      'import { seen } from "./lib/geometry";',
      "import { a } from './lib/geometry.ts';",
      'import { part } from "./lib/parts";',
      'import "./style.css";',
      'const lazy = import("./lib/geometry");',
      'export { b } from "./lib/geometry";',
      'import { other } from "./not-in-the-item";',
      'import { fixed } from "@vectoys/engine";',
    ].join("\n"),
  );
});

test("a file going deeper reaches back up", () => {
  const moves = new Map([
    ["a.ts", "deep/a.ts"],
    ["b.ts", "b.ts"],
  ]);
  expect(rewriteImports('import { b } from "./b";', "a.ts", moves)).toBe('import { b } from "../b";');
});
