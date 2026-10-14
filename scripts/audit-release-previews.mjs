/** Audit the actual compiled catalog's generated HTML and text preview files. */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { createEmail, listThemePresets } from "../packages/email/dist/index.js";
import { auditPreviewManifest } from "./lib/TemplatePreviewAudit.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const previewDir = join(root, "generated", "template-audit");
const reportFile = join(previewDir, "release-quality-report.json");
const catalog = createEmail().listBuiltinCatalog();
const themes = listThemePresets();
let manifest;
try {
  manifest = JSON.parse(await readFile(join(previewDir, "report.json"), "utf8"));
} catch (error) {
  console.error("Missing/invalid generated/template-audit/report.json. Run node scripts/generate-all-template-previews.mjs after building.");
  console.error(String(error));
  process.exitCode = 1;
}
if (manifest) {
  const result = auditPreviewManifest(manifest, catalog, themes);
  for (const entry of manifest.entries ?? []) {
    // Only visit files with paths validated against the known catalog and theme matrix.
    const slug = `${entry?.id}--${entry?.theme}--${entry?.variant}`;
    const expectedHtml = `previews/${slug}.html`;
    const expectedText = `previews/${slug}.txt`;
    if (entry?.html !== expectedHtml || entry?.text !== expectedText ||
      !catalog.some(item => item.id === entry.id) || !themes.includes(entry.theme) ||
      !["default", "no-heading"].includes(entry.variant)) continue;
    try {
      const [html, text] = await Promise.all([
        readFile(join(previewDir, expectedHtml), "utf8"),
        readFile(join(previewDir, expectedText), "utf8"),
      ]);
      if (!/<html\b/i.test(html) || !/<\/html>/i.test(html) || !text.trim()) {
        result.errors.push(`Empty or invalid HTML/plain-text content: ${slug}`);
      }
      if (Buffer.byteLength(html) !== entry.htmlBytes || Buffer.byteLength(text) !== entry.textBytes) {
        result.errors.push(`Output size differs from manifest: ${slug}`);
      }
    } catch (error) {
      result.errors.push(`Missing or unreadable output for ${slug}: ${String(error)}`);
    }
  }
  const report = {
    generatedAt: new Date().toISOString(), catalogCount: catalog.length,
    themeCount: themes.length, expected: result.expected,
    checked: manifest.entries?.length ?? 0, errors: result.errors,
    warnings: result.warnings,
  };
  await writeFile(reportFile, JSON.stringify(report, null, 2) + "\n");
  console.log(`MailForge quality gate: ${report.checked} previews, ${report.errors.length} errors, ${report.warnings.length} warnings`);
  console.log(`Report: ${reportFile}`);
  for (const error of result.errors.slice(0, 20)) console.error(`FAIL: ${error}`);
  for (const warning of result.warnings.slice(0, 20)) console.warn(`WARN: ${warning}`);
  if (result.errors.length || result.warnings.length) process.exitCode = 1;
}
