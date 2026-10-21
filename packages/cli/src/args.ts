export type Args = {
  command: string | undefined;
  rest: string[];
  flags: {
    help: boolean;
    version: boolean;
    yes: boolean;
    overwrite: boolean;
    install: boolean;
    registry: string | undefined;
    cwd: string | undefined;
  };
};

const VALUES = new Set(["--registry", "--cwd"]);

export function parseArgs(argv: string[]): Args {
  const flags: Args["flags"] = {
    help: false,
    version: false,
    yes: false,
    overwrite: false,
    install: true,
    registry: undefined,
    cwd: undefined,
  };
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const [name, inline] = arg.startsWith("--") && arg.includes("=") ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)] : [arg, undefined];
    if (VALUES.has(name)) {
      const value = inline ?? argv[++i];
      if (!value) throw new Error(`${name} needs a value.`);
      flags[name === "--registry" ? "registry" : "cwd"] = value;
    } else if (name === "-h" || name === "--help") flags.help = true;
    else if (name === "-v" || name === "--version") flags.version = true;
    else if (name === "-y" || name === "--yes") flags.yes = true;
    else if (name === "-o" || name === "--overwrite") flags.overwrite = true;
    else if (name === "--no-install") flags.install = false;
    else if (name.startsWith("-")) throw new Error(`Unknown option ${name}. Run "vectoys --help" to see the options.`);
    else positional.push(arg);
  }
  return { command: positional[0], rest: positional.slice(1), flags };
}
