import { expect, test } from "bun:test";
import type { Config } from "../src/config";
import { indexUrl, itemUrl } from "../src/resolve";

const config: Config = {
  dir: "src/components/vectoys",
  registry: "https://vectoys.com/r",
  registries: { "@acme": "https://acme.dev/r/", "@tmpl": "https://tmpl.dev/items/{name}.json" },
};

test("a plain name comes from the default registry, or the one given", () => {
  expect(itemUrl("phone", config)).toBe("https://vectoys.com/r/phone.json");
  expect(itemUrl("laptop-14", config, "http://localhost:4000/r")).toBe("http://localhost:4000/r/laptop-14.json");
});

test("a scoped name comes from the registry its scope maps to", () => {
  expect(itemUrl("@acme/thing", config)).toBe("https://acme.dev/r/thing.json");
  expect(itemUrl("@tmpl/thing", config)).toBe("https://tmpl.dev/items/thing.json");
  expect(itemUrl("@acme/thing", config, "http://localhost:4000/r")).toBe("https://acme.dev/r/thing.json");
  expect(() => itemUrl("@nobody/thing", config)).toThrow('No registry is set for @nobody. Add it to "registries"');
});

test("a URL is taken as it is", () => {
  expect(itemUrl("https://example.com/r/x.json", config)).toBe("https://example.com/r/x.json");
  expect(itemUrl("http://localhost:3000/r/x.json", config)).toBe("http://localhost:3000/r/x.json");
});

test("anything else is turned away", () => {
  expect(() => itemUrl("../phone", config)).toThrow("is not an item name");
  expect(() => itemUrl("ftp://x/y.json", config)).toThrow("is not an item name");
});

test("a registry's index sits next to its items", () => {
  expect(indexUrl(undefined, config)).toBe("https://vectoys.com/r/index.json");
  expect(indexUrl("@acme", config)).toBe("https://acme.dev/r/index.json");
  expect(indexUrl(undefined, config, "http://localhost:4000/r")).toBe("http://localhost:4000/r/index.json");
});
