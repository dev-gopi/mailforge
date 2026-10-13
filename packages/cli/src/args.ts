/** Small strict parser: no shell expansion or evaluation of user values. */
export interface ParsedCliArgs {
  readonly command: string;
  readonly positional: readonly string[];
  readonly flags: Readonly<Record<string, string | boolean>>;
}

const FLAG_NAMES = new Set([
  "help", "json", "dir", "category", "data", "config", "options", "out",
  "theme", "theme-name", "layout", "variant", "locale", "brand", "color",
  "no-heading", "force", "themes-file", "variants-file", "template-version",
]);
const BOOLEAN_FLAGS = new Set(["help", "json", "no-heading", "force"]);

export function parseCliArgs(argv: readonly string[]): ParsedCliArgs {
  if (!Array.isArray(argv) || argv.some(value => typeof value !== "string")) {
    throw new Error("Expected an array of CLI arguments");
  }
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = Object.create(null) as Record<string, string | boolean>;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]!;
    if (arg === "-h") {
      if (Object.hasOwn(flags, "help")) throw new Error("Duplicate option: --help");
      flags.help = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      if (arg.startsWith("-")) throw new Error(`Unknown argument: ${arg}`);
      positional.push(arg);
      continue;
    }
    const equal = arg.indexOf("=");
    const name = equal === -1 ? arg.slice(2) : arg.slice(2, equal);
    if (!FLAG_NAMES.has(name)) throw new Error(`Unknown option: --${name}`);
    if (Object.hasOwn(flags, name)) throw new Error(`Duplicate option: --${name}`);
    if (BOOLEAN_FLAGS.has(name)) {
      if (equal !== -1) throw new Error(`--${name} does not accept a value`);
      flags[name] = true;
      continue;
    }
    const value = equal === -1 ? argv[++index] : arg.slice(equal + 1);
    if (value === undefined || value.length === 0 || value.startsWith("--")) {
      throw new Error(`--${name} requires a value`);
    }
    flags[name] = value;
  }
  return { command: positional[0] ?? "help", positional: positional.slice(1), flags };
}

export function option(flags: ParsedCliArgs["flags"], key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" ? value : undefined;
}

export function assertOnlyOptions(flags: ParsedCliArgs["flags"], allowed: readonly string[]): void {
  const accepted = new Set([...allowed, "help"]);
  for (const flag of Object.keys(flags)) {
    if (!accepted.has(flag)) throw new Error(`Option --${flag} is not supported for this command`);
  }
}

export function assertPositional(args: readonly string[], count: number, usage: string): void {
  if (args.length !== count) throw new Error(`Usage: ${usage}`);
}
