import { readFile, writeFile, mkdir, access, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import {
  createEmail,
  auditTemplateCatalog,
  type EmailConfigOptions,
  type TemplateRenderOptions,
} from "@mailforge/email";
import { parseCliArgs, option, assertOnlyOptions, assertPositional } from "./args.js";

export interface CliOutput {
  log(message: string): void;
}

const HELP = `MailForge CLI — local email template tools

Usage:
  mailforge help
  mailforge init [--dir ./my-email-project]
  mailforge list [--category marketing] [--json]
  mailforge inspect <template-id> [--json]
  mailforge themes [--json]
  mailforge layouts [--json]
  mailforge variants <template-id> [--json]
  mailforge versions <template-id> [--json]
  mailforge audit [--json]
  mailforge validate <template-id> --data ./welcome.data.json [render options]
  mailforge render <template-id> --data ./welcome.data.json --out ./generated/welcome [render options]

Render options:
  --config FILE         Engine configuration JSON
  --options FILE        Per-render options JSON (must use safe trust)
  --theme PRESET        modern | minimal | corporate
  --theme-name NAME     Name imported from --themes-file
  --themes-file FILE    ThemeRegistry export JSON
  --variants-file FILE  TemplateVariantRegistry export JSON
  --layout NAME         transactional | marketing | billing | notification
  --variant NAME        default | compact | premium | branded | custom imported variant
  --locale TAG          Language tag, e.g. bn-IN
  --brand NAME          Company display name
  --color #RRGGBB       Brand accent color
  --template-version V  Published template version (must be registered)
  --no-heading          Hide the main heading
  --force               Allow replacing existing output files

The CLI never sends email and renders in safe mode by default.`;

const MAX_JSON_FILE_BYTES = 1024 * 1024;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

async function loadJson(path: string, cwd: string): Promise<unknown> {
  const target = resolve(cwd, path);
  const info = await stat(target);
  if (info.size > MAX_JSON_FILE_BYTES) throw new Error(`JSON file exceeds 1 MiB: ${path}`);
  const content = await readFile(target);
  try { return JSON.parse(content.toString("utf8")) as unknown; }
  catch { throw new Error(`Invalid JSON file: ${path}`); }
}

async function loadObject(path: string, cwd: string): Promise<Record<string, unknown>> {
  const parsed = await loadJson(path, cwd);
  if (!isRecord(parsed)) throw new Error(`Expected a JSON object: ${path}`);
  return parsed;
}

async function ensureNotExists(target: string): Promise<void> {
  try { await access(target); throw new Error(`File already exists (use --force): ${target}`); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

function format(value: unknown, json: boolean): string {
  if (json) return JSON.stringify(value, null, 2);
  if (Array.isArray(value)) {
    return value.map(item => isRecord(item)
      ? `${String(item.id ?? item.name ?? "")}${item.category ? `  [${String(item.category)}]` : ""}${item.title ? `  ${String(item.title)}` : ""}`
      : String(item)).join("\n");
  }
  return JSON.stringify(value, null, 2);
}

function requireCatalogItem(id: string, catalog: readonly { id: string }[]): void {
  if (!catalog.some(item => item.id === id)) throw new Error(`Unknown MailForge template: ${id}`);
}

/** Execute commands using the production email engine; this function is also testable. */
export async function runCli(
  argv: readonly string[],
  cwd: string = process.cwd(),
  output: CliOutput = console,
): Promise<void> {
  const { command, positional, flags } = parseCliArgs(argv);
  if (flags.help || command === "help") { output.log(HELP); return; }
  if (command === "init") {
    assertOnlyOptions(flags, ["dir", "force"]);
    assertPositional(positional, 0, "mailforge init [--dir DIRECTORY]");
    const dir = resolve(cwd, option(flags, "dir") ?? "mailforge-example");
    const configuration = resolve(dir, "mailforge.config.json");
    const data = resolve(dir, "welcome.data.json");
    if (!flags.force) { await ensureNotExists(configuration); await ensureNotExists(data); }
    await mkdir(dir, { recursive: true });
    await writeFile(configuration, JSON.stringify({ brand: { name: "Acme", primaryColor: "#2563eb", supportEmail: "support@example.com" }, theme: { preset: "modern" } }, null, 2) + "\n");
    await writeFile(data, JSON.stringify({ user: { firstName: "Priya" }, actionUrl: "https://example.com/dashboard" }, null, 2) + "\n");
    output.log(`Created ${configuration}\nCreated ${data}`);
    return;
  }

  const email = createEmail();
  const catalog = email.listBuiltinCatalog();

  if (command === "list") {
    assertOnlyOptions(flags, ["category", "json"]);
    assertPositional(positional, 0, "mailforge list [--category CATEGORY]");
    const category = option(flags, "category");
    if (category !== undefined && !catalog.some(item => item.category === category)) {
      throw new Error(`Unknown catalog category: ${category}`);
    }
    const result = category ? catalog.filter(item => item.category === category) : catalog;
    output.log(format(result, Boolean(flags.json)));
    return;
  }
  if (command === "inspect") {
    assertOnlyOptions(flags, ["json"]);
    assertPositional(positional, 1, "mailforge inspect TEMPLATE_ID");
    const id = positional[0]!;
    requireCatalogItem(id, catalog);
    output.log(format(catalog.find(item => item.id === id), true));
    return;
  }
  if (command === "themes" || command === "layouts") {
    assertOnlyOptions(flags, ["json"]);
    assertPositional(positional, 0, `mailforge ${command}`);
    const items = command === "themes" ? email.listThemes() : email.listLayoutPresets();
    output.log(format(items, Boolean(flags.json)));
    return;
  }
  if (command === "variants" || command === "versions") {
    assertOnlyOptions(flags, ["json"]);
    assertPositional(positional, 1, `mailforge ${command} TEMPLATE_ID`);
    const id = positional[0]!;
    requireCatalogItem(id, catalog);
    const items = command === "variants" ? email.listTemplateVariants(id) : email.listTemplateVersions(id);
    output.log(format(items, Boolean(flags.json)));
    return;
  }
  if (command === "audit") {
    assertOnlyOptions(flags, ["json"]);
    assertPositional(positional, 0, "mailforge audit");
    const report = auditTemplateCatalog();
    output.log(format(report, true));
    if (!report.valid) throw new Error(`Catalog audit failed: ${report.issues.length} issue(s)`);
    return;
  }
  if (command !== "validate" && command !== "render") throw new Error(`Unknown command: ${command}`);

  assertOnlyOptions(flags, [
    "data", "config", "options", "out", "theme", "theme-name", "layout",
    "variant", "locale", "brand", "color", "no-heading", "force",
    "themes-file", "variants-file", "template-version",
  ]);
  assertPositional(positional, 1, `mailforge ${command} TEMPLATE_ID --data FILE${command === "render" ? " --out PREFIX" : ""}`);
  const id = positional[0]!;
  requireCatalogItem(id, catalog);
  const dataPath = option(flags, "data");
  if (!dataPath) throw new Error("--data FILE is required");
  const inputData = await loadObject(dataPath, cwd);

  const configPath = option(flags, "config");
  const config = configPath ? await loadObject(configPath, cwd) : {};
  const themePreset = option(flags, "theme");
  const brandName = option(flags, "brand");
  const brandColor = option(flags, "color");
  const brand = isRecord(config.brand) ? { ...config.brand } : {};
  if (brandName !== undefined) brand.name = brandName;
  if (brandColor !== undefined) {
    if (!/^#[0-9a-f]{6}$/i.test(brandColor)) throw new Error("--color must be #RRGGBB");
    brand.primaryColor = brandColor;
  }
  if (brandName !== undefined || brandColor !== undefined) config.brand = brand;
  if (themePreset !== undefined) {
    config.theme = { ...(isRecord(config.theme) ? config.theme : {}), preset: themePreset };
  }
  // Validated by the MailForge config resolver; never bypass the trusted core.
  const engine = createEmail(config as EmailConfigOptions);
  const themesFile = option(flags, "themes-file");
  if (themesFile !== undefined) engine.importRegisteredThemes(await readFile(resolve(cwd, themesFile), "utf8"));
  const variantsFile = option(flags, "variants-file");
  if (variantsFile !== undefined) engine.importTemplateVariants(await readFile(resolve(cwd, variantsFile), "utf8"));

  const optsPath = option(flags, "options");
  const rawOpts = optsPath ? await loadObject(optsPath, cwd) : {};
  if (rawOpts.trust !== undefined && rawOpts.trust !== "safe") {
    throw new Error("CLI only supports safe rendering; trust: trusted is forbidden");
  }
  // Do not let an options file replace validated input data or switch to unsafe HTML.
  delete rawOpts.data;
  const options: TemplateRenderOptions = { ...(rawOpts as TemplateRenderOptions), data: inputData, trust: "safe" };
  const layout = option(flags, "layout");
  if (layout !== undefined) {
    if (!engine.listLayoutPresets().some(name => name === layout)) throw new Error(`Unknown layout preset: ${layout}`);
    options.layoutPreset = layout as NonNullable<TemplateRenderOptions["layoutPreset"]>;
  }
  const variant = option(flags, "variant");
  if (variant !== undefined) options.variant = variant;
  const locale = option(flags, "locale");
  if (locale !== undefined) options.locale = locale;
  const namedTheme = option(flags, "theme-name");
  if (namedTheme !== undefined) options.themeName = namedTheme;
  const version = option(flags, "template-version");
  if (version !== undefined) options.templateVersion = { version };
  if (flags["no-heading"]) options.display = { ...options.display, heading: false };

  // Rendering also validates category-specific Zod contracts, URLs, and output budgets.
  const result = await engine.render(id, options);
  if (command === "validate") {
    output.log(`VALID: ${id} (subject: ${result.subject})`);
    return;
  }
  const out = option(flags, "out");
  if (out === undefined) throw new Error("--out PREFIX is required for render");
  const prefix = resolve(cwd, out);
  const html = `${prefix}.html`;
  const text = `${prefix}.txt`;
  if (!flags.force) { await ensureNotExists(html); await ensureNotExists(text); }
  await mkdir(dirname(prefix), { recursive: true });
  await writeFile(html, result.html, { flag: flags.force ? "w" : "wx" });
  await writeFile(text, result.text, { flag: flags.force ? "w" : "wx" });
  output.log(`Rendered ${id}\nSubject: ${result.subject}\nHTML: ${html}\nText: ${text}`);
}
