import { posix } from "node:path";

export type ItemFile = { path: string; content: string };

/** A file as it lands in the project, relative to the item's folder. */
export type Placed = { from: string; to: string; content: string };

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"];
const RELATIVE = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.\.?\/[^"']*)\2/g;

/**
 * Where each of an item's files goes in its folder: its path below the
 * folder all of them share, so files that import each other keep their
 * places, and those imports are pointed at the files' new places.
 */
export function place(given: ItemFile[]): Placed[] {
  const files = given.map((file) => ({ ...file, path: posix.normalize(file.path.replace(/\\/g, "/")) }));
  const root = shared(files.map((file) => posix.dirname(file.path)));
  const moves = new Map(files.map((file) => [file.path, posix.relative(root, file.path)]));
  return files.map((file) => {
    const to = moves.get(file.path)!;
    if (to.startsWith("../") || posix.isAbsolute(to)) throw new Error(`"${file.path}" would land outside the item's folder.`);
    return { from: file.path, to, content: rewriteImports(file.content, file.path, moves) };
  });
}

/**
 * Points relative imports between an item's files at where those files now
 * are. `moves` maps each file's path in the registry to its path in the
 * project. Imports of files outside the item are left as they are.
 */
export function rewriteImports(content: string, from: string, moves: Map<string, string>): string {
  const here = moves.get(from) ?? from;
  return content.replace(RELATIVE, (whole, lead: string, quote: string, specifier: string) => {
    const target = find(posix.join(posix.dirname(from), specifier), moves);
    if (!target) return whole;
    const moved = moves.get(target)!;
    // Keep the specifier's own style: no extension stays no extension.
    const kept = posix.extname(specifier) ? moved : strip(moved, target, specifier);
    let next = posix.relative(posix.dirname(here), kept);
    if (!next.startsWith(".")) next = `./${next}`;
    return `${lead}${quote}${next}${quote}`;
  });
}

function find(path: string, moves: Map<string, string>): string | undefined {
  for (const candidate of [path, ...EXTENSIONS.map((ext) => path + ext), ...EXTENSIONS.map((ext) => `${path}/index${ext}`)]) {
    if (moves.has(candidate)) return candidate;
  }
  return undefined;
}

// An import of `./parts` that found `./parts/index.ts` stays a folder import.
function strip(moved: string, target: string, specifier: string): string {
  const base = posix.basename(target, posix.extname(target));
  if (base === "index" && posix.basename(specifier) !== "index") return posix.dirname(moved);
  return moved.slice(0, -posix.extname(moved).length || undefined);
}

function shared(dirs: string[]): string {
  const parts = dirs.map((dir) => (dir === "." ? [] : dir.split("/")));
  const first = parts[0] ?? [];
  let length = 0;
  while (length < first.length && parts.every((part) => part[length] === first[length])) length++;
  return first.slice(0, length).join("/") || ".";
}
