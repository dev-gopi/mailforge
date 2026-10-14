import assert from "node:assert/strict";
import { test } from "node:test";
import { auditPreviewManifest } from "../../scripts/lib/TemplatePreviewAudit.mjs";

const catalog = Array.from({ length: 103 }, (_, i) => ({ id: i === 100 ? "report-ready" : i === 101 ? "activity-notification" : i === 102 ? "password-reset-secure" : `sample-${i}` }));
const themes = ["modern", "minimal"];
function fixture() {
  const entries = [];
  for (const { id } of catalog) {
    for (const theme of themes) {
      for (const variant of theme === "modern" ? ["default", "no-heading"] : ["default"]) {
        const slug = `${id}--${theme}--${variant}`;
        entries.push({ id, theme, variant, html: `previews/${slug}.html`, text: `previews/${slug}.txt`,
          htmlBytes: 100, textBytes: 5, status: "pass", warnings: [] });
      }
    }
  }
  return { catalogCount: catalog.length, entries, successful: entries.length, failed: 0, errors: [] };
}

test("passes complete catalog and theme matrix", () => {
  const result = auditPreviewManifest(fixture(), catalog, themes);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.expected, 309);
});
test("detects omitted preview", () => {
  const manifest = fixture(); manifest.entries.pop(); manifest.successful--;
  assert.match(auditPreviewManifest(manifest, catalog, themes).errors.join(" "), /Missing preview/);
});
test("detects duplicate preview", () => {
  const manifest = fixture(); manifest.entries.push(manifest.entries[0]); manifest.successful++;
  assert.match(auditPreviewManifest(manifest, catalog, themes).errors.join(" "), /Duplicate preview/);
});
test("detects stale compiled catalog count", () => {
  const manifest = fixture(); manifest.catalogCount = 101;
  assert.match(auditPreviewManifest(manifest, catalog, themes).errors.join(" "), /catalogCount/);
});
test("detects forged preview path", () => {
  const manifest = fixture(); manifest.entries[0] = { ...manifest.entries[0], html: "../../other.html" };
  assert.match(auditPreviewManifest(manifest, catalog, themes).errors.join(" "), /Invalid output file paths/);
});
test("detects rendering failure", () => {
  const manifest = fixture(); manifest.failed = 1;
  assert.match(auditPreviewManifest(manifest, catalog, themes).errors.join(" "), /failures/);
});
test("detects missing newly registered password-reset-secure template", () => {
  const result = auditPreviewManifest(fixture(), catalog.slice(0, -1), themes);
  assert.match(result.errors.join(" "), /password-reset-secure/);
});
test("preserves renderer warnings as warnings", () => {
  const manifest = fixture(); manifest.entries[0].warnings = ["nonfatal warning"];
  assert.equal(auditPreviewManifest(manifest, catalog, themes).warnings.length, 1);
});
