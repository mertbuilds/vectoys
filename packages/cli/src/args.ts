export type Args = {
  command: string | undefined;
  rest: string[];
  flags: {
    help: boolean;
    version: boolean;
    yes: boolean;
    overwrite: boolean;
    install: boolean;
    open: boolean;
    dryRun: boolean;
    registry: string | undefined;
    cwd: string | undefined;
    dir: string | undefined;
  };
};

const VALUES = new Map<string, "registry" | "cwd" | "dir">([
  ["--registry", "registry"],
  ["--cwd", "cwd"],
  ["--dir", "dir"],
]);

export function parseArgs(argv: string[]): Args {
  const flags: Args["flags"] = {
    help: false,
    version: false,
    yes: false,
    overwrite: false,
    install: true,
    open: false,
    dryRun: false,
    registry: undefined,
    cwd: undefined,
    dir: undefined,
  };
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const [name, inline] = arg.startsWith("--") && arg.includes("=") ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)] : [arg, undefined];
    const key = VALUES.get(name);
    if (key) {
      const value = inline ?? argv[++i];
      if (!value) throw new Error(`${name} needs a value.`);
      flags[key] = value;
    } else if (name === "-h" || name === "--help") flags.help = true;
    else if (name === "-v" || name === "--version") flags.version = true;
    else if (name === "-y" || name === "--yes") flags.yes = true;
    else if (name === "-o" || name === "--overwrite") flags.overwrite = true;
    else if (name === "--no-install") flags.install = false;
    else if (name === "--open") flags.open = true;
    else if (name === "--dry-run") flags.dryRun = true;
    else if (name.startsWith("-")) throw new Error(`Unknown option ${name}. Run "vectoys --help" to see the options.`);
    else positional.push(arg);
  }
  return { command: positional[0], rest: positional.slice(1), flags };
}
