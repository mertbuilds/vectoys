import { afterAll, beforeAll, expect, test } from "bun:test";
import { buildRegistry } from "@vectoys/registry-build";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// The built CLI, run with node against a registry built from this repo and
// served over HTTP, in a fresh project, as someone would use it.
const repo = resolve(import.meta.dir, "../../..");
const work = mkdtempSync(join(tmpdir(), "vectoys-e2e-"));
const out = join(work, "r");
const cli = join(work, "cli.js");
const project = join(work, "project");
let server: ReturnType<typeof Bun.serve>;
let registry = "";

beforeAll(async () => {
  server = Bun.serve({
    port: 0,
    fetch: (request) => {
      const path = new URL(request.url).pathname.replace(/^\/r\//, "");
      if (path.includes("..")) return new Response("no", { status: 400 });
      const file = Bun.file(join(out, path));
      return file.exists().then((found) => (found ? new Response(file) : new Response("not found", { status: 404 })));
    },
  });
  registry = `${server.url.origin}/r`;
  await buildRegistry({ root: repo, out, baseUrl: registry });
  const build = Bun.spawnSync(["bun", "build", "src/index.ts", "--target", "node", "--outfile", cli], { cwd: join(import.meta.dir, "..") });
  if (build.exitCode !== 0) throw new Error(build.stderr.toString());

  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "site", private: true, dependencies: { react: "19.0.0" } }));
  writeFileSync(join(project, "bun.lock"), "");
});

afterAll(() => {
  server.stop(true);
  rmSync(work, { recursive: true, force: true });
});

async function run(...args: string[]) {
  const child = Bun.spawn(["node", cli, ...args], {
    cwd: project,
    env: { ...process.env, VECTOYS_REGISTRY: registry },
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  return { stdout, stderr, code };
}

const target = (...path: string[]) => join(project, "src/components/vectoys", ...path);

test("list shows the registry's items", async () => {
  const { stdout, code } = await run("list");
  expect(code).toBe(0);
  expect(stdout).toContain("laptop-14  14 inch laptop (license: TBD)");
  expect(stdout).toContain("phone");
  expect(stdout).toContain("tablet");
});

test("add copies the items in with headers, and says what to install", async () => {
  const { stdout, stderr, code } = await run("add", "laptop-14", "phone", `${registry}/tablet.json`, "--no-install");
  expect(stderr).toBe("");
  expect(code).toBe(0);
  expect(JSON.parse(readFileSync(join(project, "vectoys.json"), "utf8"))).toEqual({
    dir: "src/components/vectoys",
    registry: "https://vectoys.com/r",
    registries: {},
  });
  expect(stdout).toContain("Packages install with bun.");
  expect(stdout).toContain("Install what the items need with: bun add @vectoys/engine @vectoys/react");

  for (const [name, component] of [["laptop-14", "laptop.tsx"], ["phone", "phone.tsx"], ["tablet", "tablet.tsx"]] as const) {
    const source = readFileSync(join(repo, "registry", name, "src", component), "utf8");
    const copied = readFileSync(target(name, component), "utf8");
    expect(copied).toStartWith(`// vectoys ${name}, from ${registry}/${name}.json\n// License: TBD. Credit: vectoys (https://vectoys.com)\n`);
    expect(copied).toEndWith(source);
    expect(copied).toContain('from "./geometry";');
    expect(readFileSync(target(name, "geometry.ts"), "utf8")).toStartWith(`// vectoys ${name}, from`);
  }
});

test("a second add leaves files alone unless told to replace them", async () => {
  expect((await run("add", "phone", "--no-install")).stdout).toContain("Same     src/components/vectoys/phone/phone.tsx");
  writeFileSync(target("phone", "geometry.ts"), "// changed\n");
  expect((await run("add", "phone", "--no-install")).stdout).toContain("Kept     src/components/vectoys/phone/geometry.ts (pass --overwrite to replace it)");
  expect(readFileSync(target("phone", "geometry.ts"), "utf8")).toBe("// changed\n");
  expect((await run("add", "phone", "--no-install", "--overwrite")).stdout).toContain("Wrote    src/components/vectoys/phone/geometry.ts");
  expect(readFileSync(target("phone", "geometry.ts"), "utf8")).toStartWith("// vectoys phone");
});

test("errors are plain and exit with 1", async () => {
  const missing = await run("add", "nothing-here", "--no-install");
  expect(missing.code).toBe(1);
  expect(missing.stderr).toBe(`vectoys: ${registry}/nothing-here.json answered 404, no such item.\n`);
  const scope = await run("add", "@acme/thing");
  expect(scope.stderr).toContain("No registry is set for @acme.");
});

test("an item named to climb out of the folder is turned away", async () => {
  const files = [{ path: "x/Button.tsx", content: "export {};\n" }];
  writeFileSync(join(out, "climb.json"), JSON.stringify({ name: "..", files }));
  writeFileSync(join(out, "here.json"), JSON.stringify({ name: ".", files }));
  for (const name of ["climb", "here"]) {
    const { stderr, code } = await run("add", name, "--no-install");
    expect(code).toBe(1);
    expect(stderr).toContain("is not a registry item");
  }
  expect(existsSync(join(project, "src/components/Button.tsx"))).toBe(false);
  expect(existsSync(target("Button.tsx"))).toBe(false);
});

test("the copied items typecheck against the workspace packages", () => {
  const types = realpathSync(join(repo, "packages/react/node_modules/@types"));
  writeFileSync(
    join(project, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        lib: ["ES2022", "DOM"],
        module: "ESNext",
        moduleResolution: "bundler",
        jsx: "react-jsx",
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: [],
        paths: {
          "@vectoys/engine": [join(repo, "packages/engine/src/index.ts")],
          "@vectoys/react": [join(repo, "packages/react/src/index.ts")],
          react: [join(types, "react")],
          "react/*": [join(types, "react/*")],
        },
      },
      include: ["src"],
    }),
  );
  writeFileSync(
    join(project, "src/page.tsx"),
    [
      'import { Laptop } from "./components/vectoys/laptop-14/laptop";',
      'import { DESK } from "./components/vectoys/laptop-14/geometry";',
      'import { Phone } from "./components/vectoys/phone/phone";',
      'import { Tablet } from "./components/vectoys/tablet/tablet";',
      "export const Page = () => (<><Laptop eye={DESK} closed={0.5}><p>a</p></Laptop><Phone yaw={30}><p>b</p></Phone><Tablet><p>c</p></Tablet></>);",
    ].join("\n"),
  );
  const check = Bun.spawnSync([join(repo, "node_modules/.bin/tsc"), "-p", project]);
  expect(check.stdout.toString() + check.stderr.toString()).toBe("");
  expect(check.exitCode).toBe(0);
}, 60_000);
