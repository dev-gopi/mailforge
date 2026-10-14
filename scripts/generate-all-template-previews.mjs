import { getTemplatePreviewData } from "../apps/playground/template-preview-fixtures.mjs";
/**
 * Generate real MJML-compiled HTML/text previews for ALL packaged MailForge templates.
 * Usage (after pnpm install && pnpm build):
 *   node scripts/generate-all-template-previews.mjs
 * Output: generated/template-audit/index.html, report.json, and email files.
 * Fails with nonzero exit if ANY template/theme combination fails.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createEmail,
  listThemePresets,
} from "../packages/email/dist/index.js";

const outputDir = path.resolve("generated/template-audit");
const assetsDir = path.join(outputDir, "previews");
const themes = listThemePresets();
const h = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

await mkdir(assetsDir, { recursive: true });
const entries = [];
const errors = [];
const catalogEngine = createEmail({ brand: { name: "Acme", supportEmail: "support@example.com" } });
const catalog = catalogEngine.listBuiltinCatalog();
if (catalog.length < 104 || !catalog.some(item => item.id === "order-shipped-notice") || !catalog.some(item => item.id === "password-reset-secure") || !catalog.some(item => item.id === "report-ready") ||
    !catalog.some(item => item.id === "activity-notification")) {
  throw new Error(`Compiled catalog has ${catalog.length} templates, but report-ready, activity-notification, password-reset-secure and order-shipped-notice must all be present. Rebuild all packages first: npx --yes pnpm@10.34.7 -r --if-present build`);
}

for (const template of catalog) {
  const data = getTemplatePreviewData(template);
  for (const theme of themes) {
    const engine = createEmail({
      brand: { name: "Acme", primaryColor: theme === "corporate" ? "#173b70" : theme === "minimal" ? "#222222" : "#2563eb", supportEmail: "support@example.com" },
      theme: { preset: theme },
    });
    // An additional no-heading sample is generated for the first theme.
    for (const variant of theme === "modern" ? ["default", "no-heading"] : ["default"]) {
      const slug = `${template.id}--${theme}--${variant}`;
      try {
        const result = await engine.render(template.id, {
          data,
          ...(variant === "no-heading" ? { display: { heading: false, headerTitle: false, eyebrow: false } } : {}),
        });
        if (!result.html.includes("<html") || !result.text.trim()) throw new Error("Missing compiled HTML or plain text");
        await Promise.all([
          writeFile(path.join(assetsDir, `${slug}.html`), result.html),
          writeFile(path.join(assetsDir, `${slug}.txt`), result.text),
        ]);
        const row = {
          id: template.id, category: template.category, theme, variant,
          subject: result.subject, html: `previews/${slug}.html`, text: `previews/${slug}.txt`,
          htmlBytes: Buffer.byteLength(result.html), textBytes: Buffer.byteLength(result.text),
          hasBrand: result.html.includes("Acme"),
          hasUnsubscribe: /unsubscribe/i.test(result.html),
          warnings: result.warnings,
          status: "pass",
        };
        entries.push(row);
        process.stdout.write(`PASS ${slug}\n`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ id: template.id, theme, variant, message });
        process.stderr.write(`FAIL ${slug}: ${message}\n`);
      }
    }
  }
}
const categories = [...new Set(catalog.map(t => t.category))];
const links = entries.map(item => `<tr><td>${h(item.id)}</td><td>${h(item.theme)}</td><td>${h(item.variant)}</td><td>${h(item.subject)}</td><td><a href="${h(item.html)}">HTML</a> · <a href="${h(item.text)}">Text</a></td></tr>`).join("\n");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MailForge template render audit</title><style>body{background:#f3f5fa;color:#132036;font:15px/1.55 system-ui,sans-serif;margin:0;padding:36px 16px}main{margin:auto;max-width:1120px}h1{font-size:30px}section{background:white;padding:22px;border-radius:14px;box-shadow:0 2px 14px #14253e10;overflow:auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #e5e8ef;padding:10px}th{font-size:13px;color:#52627c}a{color:#214fd4}small{color:#52627c}</style></head><body><main><h1>MailForge — template render audit</h1><p>These files were generated using MailForge's real <code>createEmail().render()</code> pipeline, not handcrafted mockups.</p><p><b>${catalog.length} templates</b> · ${h(categories.join(", "))} · ${entries.length} successful render combinations · <b>${errors.length} failures</b></p><section><table><thead><tr><th>Template</th><th>Theme</th><th>Display</th><th>Subject</th><th>Preview</th></tr></thead><tbody>${links}</tbody></table></section><p><small>Browser previews are not proof of Outlook/Gmail/Apple Mail compatibility. Validate in real inboxes before release.</small></p></main></body></html>`;
await writeFile(path.join(outputDir, "index.html"), html);
await writeFile(path.join(outputDir, "report.json"), JSON.stringify({ generatedAt: new Date().toISOString(), catalogCount: catalog.length, successful: entries.length, failed: errors.length, entries, errors }, null, 2));
console.log(`\nGallery: ${path.join(outputDir, "index.html")}`);
console.log(`Finished ${entries.length}/${catalog.length * (themes.length + (themes.includes("modern") ? 1 : 0))} previews; ${errors.length} failures`);
if (errors.length) process.exitCode = 1;
