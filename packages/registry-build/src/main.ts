import { join, resolve } from "node:path";
import { buildRegistry } from "./index";

// bun packages/registry-build/src/main.ts [--out dir] [--base-url url]
const root = resolve(import.meta.dir, "../../..");
const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
};

const out = resolve(option("--out") ?? join(root, "apps/demo/public/r"));
const baseUrl = option("--base-url");
const index = await buildRegistry({ root, out, ...(baseUrl ? { baseUrl } : {}) });
console.log(`Wrote ${index.items.length} items to ${out}`);
