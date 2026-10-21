import { expect, test } from "bun:test";
import { place } from "../src/files";

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
