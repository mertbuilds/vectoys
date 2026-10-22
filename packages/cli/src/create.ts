import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { ITEM_NAME, type Context } from "./commands";

/** The component an item named `name` exports: `my-toy` is `MyToy`. */
export function componentName(name: string): string {
  const joined = name
    .split(/[^a-zA-Z0-9]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
  return /^[A-Za-z]/.test(joined) ? joined : `Item${joined}`;
}

/** `my-toy` as a title, `My toy`. */
function titleOf(name: string): string {
  const words = name.replace(/[-_.]+/g, " ").trim() || "item";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The name git commits under here, to credit the item to; none if git has none. */
function gitAuthor(cwd: string): string | undefined {
  const result = spawnSync("git", ["config", "user.name"], { cwd, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() || undefined : undefined;
}

/** The files of a new item named `name`, by their path in its folder. */
export function scaffold(name: string, author?: string): Record<string, string> {
  const component = componentName(name);
  const title = titleOf(name);
  const item = {
    name,
    title,
    description: `${title}: a tilted slab drawn as SVG paths. Say what it is and what it does.`,
    files: ["src/geometry.ts", `src/${name}.tsx`],
    dependencies: ["@vectoys/engine", "@vectoys/react"],
    license: "TBD",
    ...(author ? { author } : {}),
  };
  const pkg = {
    name: `@vectoys/${name}`,
    version: "0.0.0",
    private: true,
    description: `${title} drawn with the vectoys engine.`,
    type: "module",
    sideEffects: false,
    exports: { ".": "./src/index.ts" },
    scripts: { typecheck: "tsc --noEmit", test: "bun test" },
    dependencies: { "@vectoys/engine": "workspace:*", "@vectoys/react": "workspace:*" },
    peerDependencies: { react: ">=19" },
    devDependencies: { "@types/react": "19.0.0", "@types/react-dom": "19.0.0", react: "19.0.0", "react-dom": "19.0.0" },
  };
  const tsconfig = { extends: "../../tsconfig.base.json", compilerOptions: { jsx: "react-jsx" }, include: ["src", "test"] };
  const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

  return {
    "item.json": json(item),
    "package.json": json(pkg),
    "tsconfig.json": json(tsconfig),
    "src/geometry.ts": `import { camera, draw, plate, rotateX, slab, type Part, type Pose } from "@vectoys/engine";

// A slab 60 by 40 scene units and 4 deep, with a plate on its face. In the
// slab's own plane x runs across from its middle, y down from its middle and
// z out of its face. Change the parts to make the item yours.
export const WIDTH = 60;
export const HEIGHT = 40;
export const THICKNESS = 4;
const INSET = 6;

/** How the slab turns towards the eye at rest, in degrees. */
export const TILT = { yaw: -24, pitch: -16 } as const;

function parts(pose: Pose): Part[] {
  return [
    slab({
      name: "body",
      box: [-WIDTH / 2, -HEIGHT / 2, WIDTH / 2, HEIGHT / 2],
      radii: [4, 4],
      thickness: THICKNESS,
      edge: 1,
      pose,
      children: [plate({ name: "face", box: [-WIDTH / 2 + INSET, -HEIGHT / 2 + INSET, WIDTH / 2 - INSET, HEIGHT / 2 - INSET], radii: [2, 2], role: "face" })],
    }),
  ];
}

/** The slab as the eye sees it, turned by \`yaw\` and \`pitch\`: the camera and the parts drawn. */
export function seen(yaw: number = TILT.yaw, pitch: number = TILT.pitch) {
  const eye = camera({ width: 100, height: 80, perspective: 280, yaw, pitch });
  // Upright, the slab's face looks at the eye.
  const pose: Pose = { position: [0, THICKNESS / 2, 0], rotation: rotateX(-90) };
  return { camera: eye, drawn: draw(parts(pose), eye) };
}

export type View = ReturnType<typeof seen>;
`,
    [`src/${name}.tsx`]: `import { Faces, Stage, type Look, type StyleWithVariables } from "@vectoys/react";
import { useMemo, type CSSProperties } from "react";
import { TILT, seen } from "./geometry";

// The page's colours, as CSS variables, each with a tone so the item shows as
// meant before they are set.
const HAIRLINE = "var(--vectoys-hairline, #8a8a8a)";
const SURFACE = "var(--vectoys-surface, #f5f5f5)";
const FINISH = "var(--vectoys-finish, #5b7cfa)";

const fill = (color: string): Look => ({ style: { fill: color } });
const STYLES: Record<string, Look> = {
  top: fill(FINISH),
  bottom: fill(FINISH),
  side: fill(FINISH),
  face: fill(SURFACE),
};

const OUTLINE: Look = {
  vectorEffect: "non-scaling-stroke",
  strokeWidth: 1,
  strokeLinejoin: "round",
  style: { stroke: HAIRLINE, fill: "none" },
};

export type ${component}Props = {
  /** What the item shows, for assistive technology. */
  label?: string;
  /** The slab's colour; by default the page's \`--vectoys-finish\`. */
  finish?: string;
  /** How far it turns about its up axis, in degrees. */
  yaw?: number;
  /** How far it tips towards or away from the eye, in degrees. */
  pitch?: number;
  className?: string;
  style?: CSSProperties;
};

/** ${title}: a slab tilted towards the eye, drawn the same on the server and the client. */
export function ${component}({ label = ${JSON.stringify(title)}, finish, yaw = TILT.yaw, pitch = TILT.pitch, className, style }: ${component}Props) {
  const view = useMemo(() => seen(yaw, pitch), [yaw, pitch]);
  const body = view.drawn.hulls.find((hull) => hull.part === "body");
  const vars: StyleWithVariables = finish ? { "--vectoys-finish": finish } : {};
  return (
    <div role="img" aria-label={label} className={className} style={style}>
      <Stage camera={view.camera} style={vars}>
        <Faces faces={view.drawn.faces} hulls={view.drawn.hulls} styles={STYLES} shading />
        {body && <path d={body.d} {...OUTLINE} />}
      </Stage>
    </div>
  );
}
`,
    "src/index.ts": `export { HEIGHT, THICKNESS, TILT, WIDTH, seen, type View } from "./geometry";
export { ${component}, type ${component}Props } from "./${name}";
`,
    [`test/${name}.test.tsx`]: `import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ${component} } from "../src";

test("renders on the server as a labelled image with no NaN", () => {
  const html = renderToStaticMarkup(<${component} label="A blue slab" finish="#3b82f6" />);
  expect(html).toStartWith('<div role="img" aria-label="A blue slab"');
  expect(html).toContain("--vectoys-finish:#3b82f6");
  expect(html).not.toContain("NaN");
});
`,
  };
}

/** Writes a new item's folder, `<under>/<name>`, ready to draw in and check. */
export function create(context: Context, name: string | undefined, under: string | undefined) {
  if (!name) throw new Error('Name the new item, as "vectoys create spinner".');
  if (!ITEM_NAME.test(name)) throw new Error(`"${name}" is not an item name. Use letters, digits, dots, dashes and underscores.`);
  const folder = resolve(context.cwd, under ?? ".", name);
  const shown = relative(context.cwd, folder) || ".";
  if (existsSync(folder) && !context.overwrite) throw new Error(`${shown} is already there. Pass --overwrite to write over it.`);
  for (const [path, content] of Object.entries(scaffold(name, gitAuthor(context.cwd)))) {
    const to = join(folder, path);
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, content);
    context.log(`Wrote    ${relative(context.cwd, to)}`);
  }
  context.log(`Draw it in ${shown}/src, then run "vectoys check ${shown}" before you submit it.`);
}
