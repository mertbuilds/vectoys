import { posix } from "node:path";

export type ItemFile = { path: string; content: string };

/** A file as it lands in the project, relative to the item's folder. */
export type Placed = { from: string; to: string; content: string };

/**
 * Where each of an item's files goes in its folder: its path below the
 * folder all of them share, so files that import each other keep their
 * places and their relative imports still work.
 */
export function place(given: ItemFile[]): Placed[] {
  const files = given.map((file) => ({ ...file, path: posix.normalize(file.path.replace(/\\/g, "/")) }));
  const root = shared(files.map((file) => posix.dirname(file.path)));
  return files.map((file) => {
    const to = posix.relative(root, file.path);
    if (to.startsWith("../") || posix.isAbsolute(to)) throw new Error(`"${file.path}" would land outside the item's folder.`);
    return { from: file.path, to, content: file.content };
  });
}

function shared(dirs: string[]): string {
  const parts = dirs.map((dir) => (dir === "." ? [] : dir.split("/")));
  const first = parts[0] ?? [];
  let length = 0;
  while (length < first.length && parts.every((part) => part[length] === first[length])) length++;
  return first.slice(0, length).join("/") || ".";
}
