import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { bunScript, componentFile, readItem, runInBun } from "./check";
import type { Context } from "./commands";
import { componentName } from "./create";

/** The turns a preview shows an item at, in degrees, when it takes a `yaw`. */
export const YAWS = [-45, -20, 0, 20, 45];

// The component rendered as it comes, and at each yaw. It takes a yaw when the
// two turns furthest apart draw differently.
const RUNNER = bunScript(`const render = (props) => renderToStaticMarkup(createElement(mod[name], props));
  const yaws = ${JSON.stringify(YAWS)}.map((yaw) => ({ yaw, html: render({ yaw }) }));
  const turns = yaws[0].html !== yaws[yaws.length - 1].html;
  done({ name, html: render(), yaws: turns ? yaws : [] });`);

export type Preview = { name: string; html: string; yaws: { yaw: number; html: string }[] };

function isPreview(value: unknown): value is Preview {
  if (typeof value !== "object" || value === null) return false;
  if (!("name" in value && typeof value.name === "string" && "html" in value && typeof value.html === "string")) return false;
  if (!("yaws" in value && Array.isArray(value.yaws))) return false;
  return value.yaws.every(
    (turn: unknown) => typeof turn === "object" && turn !== null && "yaw" in turn && typeof turn.yaw === "number" && "html" in turn && typeof turn.html === "string",
  );
}

// The site's tones for each scheme, so an item looks as it will on vectoys.com.
const THEMES = {
  light: `--page: #f3f4f6; --ink: #15171c; --muted: #5f6571; --vectoys-bg: #f3f4f6; --vectoys-surface: #f5f6f8; --vectoys-hairline: #8a8e96; --vectoys-border: #d2d5db; --vectoys-shadow: rgba(10, 14, 22, 0.1); --vectoys-focus: #5f6571; color-scheme: light;`,
  dark: `--page: #0f1114; --ink: #eceef2; --muted: #959baa; --vectoys-bg: #0f1114; --vectoys-surface: #3a3e46; --vectoys-hairline: #6c717c; --vectoys-border: #4b505a; --vectoys-shadow: rgba(0, 0, 0, 0.55); --vectoys-focus: #959baa; color-scheme: dark;`,
};

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Each render reuses the same ids, so every copy on the page gets its own,
// and its gradients and clips take the tones of the panel it is in.
function scoped(html: string, scope: string): string {
  return html
    .replace(/(\s(?:id|for|aria-labelledby|aria-describedby|aria-controls)=")([^"]+)"/g, (_, attribute: string, ids: string) => `${attribute}${ids.split(/\s+/).map((id) => scope + id).join(" ")}"`)
    .replace(/url\(#/g, `url(#${scope}`)
    .replace(/href="#/g, `href="#${scope}`);
}

/** A page that shows `preview` in light and dark side by side, and at each yaw if it turns. */
export function previewPage(title: string, preview: Preview): string {
  const panel = (theme: keyof typeof THEMES) => {
    const turns = preview.yaws.map(({ yaw, html }, at) => `<figure><div class="item">${scoped(html, `${theme}-${at}-`)}</div><figcaption>yaw ${yaw}</figcaption></figure>`).join("");
    return `<section class="${theme}">
<h2>${theme}</h2>
<figure class="hero"><div class="item">${scoped(preview.html, `${theme}-`)}</div><figcaption>as it comes</figcaption></figure>
${turns ? `<div class="turns">${turns}</div>` : ""}
</section>`;
  };
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} preview</title>
<style>
* { box-sizing: border-box; }
body { margin: 0; font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; background: #f3f4f6; }
header { padding: 16px 24px; color: #15171c; }
h1 { margin: 0; font-size: 18px; font-weight: 500; }
header p { margin: 0; color: #5f6571; }
main { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); }
section { padding: 24px; background: var(--page); color: var(--ink); }
section.light { ${THEMES.light} }
section.dark { ${THEMES.dark} }
h2 { margin: 0 0 16px; font-size: 13px; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
figure { margin: 0; display: grid; gap: 8px; justify-items: center; }
figcaption { font-size: 12px; color: var(--muted); }
.hero .item { width: min(100%, 360px); }
.turns { margin-top: 24px; display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 16px; }
.turns .item { width: 100%; }
</style>
</head>
<body>
<header><h1>${escape(title)}</h1><p>${escape(preview.name)}, rendered on the server${preview.yaws.length ? ` and turned to yaw ${preview.yaws.map(({ yaw }) => yaw).join(", ")}` : ""}</p></header>
<main>
${panel("light")}
${panel("dark")}
</main>
</body>
</html>
`;
}

/** Opens `path` with the system's opener. */
function open(path: string) {
  const [command, args] = process.platform === "darwin" ? ["open", [path]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", path]] : ["xdg-open", [path]];
  spawn(command, args, { detached: true, stdio: "ignore" }).unref();
}

/** Renders the item folder `given` into preview.html in it and prints its path. */
export function preview(context: Context, given: string | undefined, opening = false): string {
  const dir = resolve(context.cwd, given ?? ".");
  const item = readItem(dir);
  if (typeof item === "string") throw new Error(`${relative(context.cwd, dir) || "."} is not an item to preview: ${item}.`);
  const component = componentFile(item);
  if (!component) throw new Error("item.json lists no .tsx component to render.");
  const ran = runInBun(RUNNER, resolve(dir, component), dir, componentName(item.name));
  if ("error" in ran) throw new Error(`${component} does not render on the server: ${ran.error}`);
  if (!isPreview(ran.value)) throw new Error("bun gave back something other than markup.");
  const path = join(dir, "preview.html");
  writeFileSync(path, previewPage(item.title, ran.value));
  context.log(path);
  if (opening) open(path);
  return path;
}
