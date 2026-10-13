import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseCliArgs } from "../src/args.js";
import { runCli } from "../src/index.js";

const directories: string[] = [];
const output = () => {
  const lines: string[] = [];
  return { lines, log: (line: string) => { lines.push(line); } };
};
async function folder(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mailforge-cli-"));
  directories.push(dir);
  return dir;
}
afterEach(async () => {
  for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true });
});

describe("Stage 8.3: MailForge CLI", () => {
  it("parses arguments without eval and rejects unknown or duplicate options", () => {
    expect(parseCliArgs(["render", "welcome", "--data", "demo.json", "--no-heading"]).flags["no-heading"]).toBe(true);
    expect(() => parseCliArgs(["list", "--not-real"])).toThrow(/Unknown option/);
    expect(() => parseCliArgs(["list", "--json", "--json"])).toThrow(/Duplicate option/);
    expect(() => parseCliArgs(["render", "--data"])).toThrow(/requires a value/);
  });

  it("shows help and lists and inspects the real template catalog", async () => {
    const out = output();
    await runCli(["help"], process.cwd(), out);
    expect(out.lines[0]).toContain("mailforge render");
    await runCli(["list", "--json"], process.cwd(), out);
    expect(JSON.parse(out.lines[1]!) as unknown[]).toEqual(expect.arrayContaining([expect.objectContaining({ id: "welcome" })]));
    await runCli(["inspect", "welcome"], process.cwd(), out);
    expect(JSON.parse(out.lines[2]!)).toEqual(expect.objectContaining({ id: "welcome" }));
    await expect(runCli(["inspect", "does-not-exist"], process.cwd(), out)).rejects.toThrow(/Unknown MailForge template/);
  });

  it("initializes a project without overwriting existing files", async () => {
    const cwd = await folder();
    const out = output();
    await runCli(["init", "--dir", "example"], cwd, out);
    const config = JSON.parse(await readFile(join(cwd, "example", "mailforge.config.json"), "utf8")) as { brand: { name: string } };
    expect(config.brand.name).toBe("Acme");
    await expect(runCli(["init", "--dir", "example"], cwd, out)).rejects.toThrow(/already exists/);
  });

  it("validates and renders a real welcome email with safe HTML and text output", async () => {
    const cwd = await folder();
    await writeFile(join(cwd, "data.json"), JSON.stringify({ user: { firstName: "Gopi" }, actionUrl: "https://example.com/dashboard" }));
    const out = output();
    await runCli(["validate", "welcome", "--data", "data.json"], cwd, out);
    expect(out.lines[0]).toContain("VALID: welcome");
    await runCli([
      "render", "welcome", "--data", "data.json", "--out", "generated/welcome",
      "--theme", "corporate", "--layout", "transactional", "--no-heading",
    ], cwd, out);
    const html = await readFile(join(cwd, "generated", "welcome.html"), "utf8");
    const text = await readFile(join(cwd, "generated", "welcome.txt"), "utf8");
    expect(html).toContain("Gopi");
    expect(html).not.toContain("Welcome to your new workspace.");
    expect(text.length).toBeGreaterThan(10);
    await expect(runCli(["render", "welcome", "--data", "data.json", "--out", "generated/welcome"], cwd, out)).rejects.toThrow(/already exists/);
  });

  it("rejects unsafe options and malformed or oversized JSON files", async () => {
    const cwd = await folder();
    const out = output();
    await writeFile(join(cwd, "broken.json"), "{");
    await expect(runCli(["validate", "welcome", "--data", "broken.json"], cwd, out)).rejects.toThrow(/Invalid JSON/);
    await writeFile(join(cwd, "data.json"), JSON.stringify({ user: { firstName: "Gopi" }, actionUrl: "https://example.com/dashboard" }));
    await writeFile(join(cwd, "unsafe.json"), JSON.stringify({ trust: "trusted" }));
    await expect(runCli(["validate", "welcome", "--data", "data.json", "--options", "unsafe.json"], cwd, out)).rejects.toThrow(/safe rendering/);
    await writeFile(join(cwd, "huge.json"), " ".repeat(1_100_000));
    await expect(runCli(["validate", "welcome", "--data", "huge.json"], cwd, out)).rejects.toThrow(/1 MiB/);
  });

  it("exposes theme, layout, variant and version metadata", async () => {
    const out = output();
    await runCli(["themes"], process.cwd(), out);
    expect(out.lines[0]).toContain("modern");
    await runCli(["layouts"], process.cwd(), out);
    expect(out.lines[1]).toContain("transactional");
    await runCli(["variants", "welcome", "--json"], process.cwd(), out);
    expect(out.lines[2]).toContain("premium");
    await runCli(["versions", "welcome", "--json"], process.cwd(), out);
    expect(JSON.parse(out.lines[3]!)).toEqual([]);
  });

  it("rejects unknown commands, unsupported flags, and missing data", async () => {
    const out = output();
    await expect(runCli(["tacos"], process.cwd(), out)).rejects.toThrow(/Unknown command/);
    await expect(runCli(["themes", "--data", "x"], process.cwd(), out)).rejects.toThrow(/not supported/);
    await expect(runCli(["render", "welcome"], process.cwd(), out)).rejects.toThrow(/--data FILE is required/);
  });
});
