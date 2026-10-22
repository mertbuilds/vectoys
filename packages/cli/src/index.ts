#!/usr/bin/env node
import { resolve } from "node:path";
import { version } from "../package.json";
import { parseArgs } from "./args";
import { check } from "./check";
import { add, init, list, type Context } from "./commands";
import { create } from "./create";

const HELP = `vectoys ${version}: copy vectoys devices and toys into your project.

Usage
  vectoys init                 Write vectoys.json with where items go
  vectoys add <item...>        Copy items in and install what they need
  vectoys list [@registry]     Show the items a registry has
  vectoys create <name>        Start a new item in ./<name> to draw and submit
  vectoys check [dir]          Check an item folder before you submit it (needs bun)

Items
  phone                        From the default registry
  @acme/thing                  From the registry "@acme" maps to in vectoys.json
  https://acme.dev/r/x.json    From that URL

Options
  --registry <url>   The registry for plain names (or set VECTOYS_REGISTRY)
  --cwd <dir>        Run in another folder
  --dir <dir>        Where create puts the new item's folder
  -y, --yes          Answer yes to every question
  -o, --overwrite    Replace files or a new item's folder that are already there
  --no-install       Do not install packages, only say which ones
  -h, --help         Show this help
  -v, --version      Show the version
`;

async function main(argv: string[]) {
  const { command, rest, flags } = parseArgs(argv);
  if (flags.version) return console.log(version);
  if (flags.help || !command) return console.log(HELP);
  const context: Context = {
    cwd: resolve(flags.cwd ?? process.cwd()),
    registry: flags.registry ?? (process.env.VECTOYS_REGISTRY || undefined),
    registryFlag: flags.registry,
    yes: flags.yes,
    overwrite: flags.overwrite,
    install: flags.install,
    log: (line) => console.log(line),
  };
  if (command === "init") return void init(context);
  if (command === "add") return add(context, rest);
  if (command === "list") return list(context, rest[0]);
  if (command === "create") return create(context, rest[0], flags.dir);
  if (command === "check") return check(context, rest[0]);
  throw new Error(`Unknown command "${command}". Run "vectoys --help" to see the commands.`);
}

main(process.argv.slice(2)).catch((error: Error) => {
  console.error(`vectoys: ${error.message}`);
  process.exitCode = 1;
});
