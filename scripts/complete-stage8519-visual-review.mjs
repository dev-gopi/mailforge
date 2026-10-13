#!/usr/bin/env node
/**
 * Final visual review after the 1,100 default previews and release audit.
 * Generates 5 * 10 EXTRA scenario previews; does not change the 1,100 matrix.
 * Reuses the actual MailForge rendering pipeline and existing audit primitives.
 * The HTML gallery is for manual desktop/mobile inspection; it is NOT evidence
 * of real Gmail, Outlook or Apple Mail certification.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createEmail, listThemePresets } from '../packages/email/dist/index.js';
import { getCatalogDesignFamily, listCatalogTemplates } from '../packages/template/dist/index.js';
import { reviewGallery, escapeHtml } from './lib/DesignReviewAudit.mjs';
import { inspectEmailPreview, inspectPreviewManifest } from './lib/PreviewQuality.mjs';
import {
  STRUCTURED_REVIEW_CASES, structuredReviewData, inspectStructuredReviewMatrix,
} from './lib/Stage8519Review.mjs';

const root = path.resolve('generated/template-audit');
const out = path.join(root, 'stage8519-review');
const previews = path.join(out, 'scenarios');
const errors = [];
const warnings = [];
const entries = [];
const themes = listThemePresets();
const brand = { name: 'Acme', supportEmail: 'support@example.com' };
const catalog = createEmail({ brand }).listBuiltinCatalog();

if (catalog.length !== 100) throw new Error(`Expected 100 templates, found ${catalog.length}`);
if (themes.length !== 10) throw new Error(`Expected 10 themes, found ${themes.length}`);
if (STRUCTURED_REVIEW_CASES.length !== 5) throw new Error('Unexpected structured review case count');
const manifest = JSON.parse(await readFile(path.join(root, 'report.json'), 'utf8'));
errors.push(...inspectPreviewManifest(manifest, themes).map(message => ({ sample: 'default-gallery', message })));

const catalogOnlyIds = new Set(listCatalogTemplates().map(item => item.id));
const familyFor = (id, category) => catalogOnlyIds.has(id)
  ? getCatalogDesignFamily(id, category) : null;
const review = reviewGallery(manifest, catalog, themes, familyFor);
errors.push(...review.errors.map(message => ({ sample: 'design-family', message })));
if (review.samples.length !== 12) {
  errors.push({ sample: 'design-family', message: `Expected 12 families, found ${review.samples.length}` });
}
const availableIds = new Set(catalog.map(item => item.id));
for (const item of STRUCTURED_REVIEW_CASES) {
  if (!availableIds.has(item.id)) errors.push({ sample: item.slug, message: `Missing template: ${item.id}` });
}

await mkdir(previews, { recursive: true });
for (const item of STRUCTURED_REVIEW_CASES) {
  for (const theme of themes) {
    const slug = `${item.slug}--${theme}`;
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Unsafe scenario file name');
    try {
      const engine = createEmail({ brand, theme: { preset: theme } });
      const result = await engine.render(item.id, { data: structuredReviewData(item) });
      const entry = { id: item.id, category: item.category, theme, variant: 'structured', subject: result.subject };
      const quality = inspectEmailPreview({ html: result.html, text: result.text, entry });
      errors.push(...quality.errors.map(message => ({ sample: slug, message })));
      warnings.push(...quality.warnings.map(message => ({ sample: slug, message })));
      if (!result.html.includes(item.marker) || !result.text.includes(item.marker)) {
        errors.push({ sample: slug, message: `Missing validated structured marker: ${item.marker}` });
      }
      const htmlFile = `scenarios/${slug}.html`;
      const textFile = `scenarios/${slug}.txt`;
      await Promise.all([
        writeFile(path.join(previews, `${slug}.html`), result.html),
        writeFile(path.join(previews, `${slug}.txt`), result.text),
      ]);
      entries.push({ slug: item.slug, id: item.id, category: item.category, theme,
        marker: item.marker, html: htmlFile, text: textFile });
      process.stdout.write(`PASS ${slug}\n`);
    } catch (error) {
      errors.push({ sample: slug, message: error instanceof Error ? error.message : String(error) });
      process.stderr.write(`FAIL ${slug}\n`);
    }
  }
}
errors.push(...inspectStructuredReviewMatrix(entries, STRUCTURED_REVIEW_CASES, themes)
  .map(message => ({ sample: 'structured-matrix', message })));

const sampleLinks = review.samples.map(item => `<li><b>${escapeHtml(item.family)}</b> — ${escapeHtml(item.id)} / ${escapeHtml(item.theme)} · <a href="../${escapeHtml(item.html)}" target="_blank" rel="noopener">Open default</a></li>`).join('\n');
const scenarioSections = STRUCTURED_REVIEW_CASES.map(item => {
  const links = entries.filter(entry => entry.slug === item.slug).map(entry =>
    `<a href="${escapeHtml(entry.html)}" target="_blank" rel="noopener">${escapeHtml(entry.theme)}</a>`).join(' · ');
  const defaultEntry = entries.find(entry => entry.slug === item.slug && entry.theme === 'modern');
  const src = defaultEntry ? escapeHtml(defaultEntry.html) : '';
  return `<section><h2>${escapeHtml(item.category)} — ${escapeHtml(item.id)}</h2><p>${links}</p>
    <div class="compare"><div><h3>Desktop, 600px</h3><iframe sandbox loading="lazy" title="${escapeHtml(item.id)} desktop" width="600" height="650" src="${src}"></iframe></div>
    <div><h3>Mobile, 375px</h3><iframe sandbox loading="lazy" title="${escapeHtml(item.id)} mobile" width="375" height="650" src="${src}"></iframe></div></div></section>`;
}).join('\n');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MailForge Stage 8.5.19 — final visual review</title><style>
*{box-sizing:border-box}body{font:15px/1.6 system-ui,sans-serif;background:#f3f5f9;color:#1a2840;margin:0;padding:30px 18px}
main{max-width:1120px;margin:auto}h1{font-size:30px}h2{font-size:20px;text-transform:capitalize}h3{font-size:14px}
section{background:white;border:1px solid #dce3ed;border-radius:12px;padding:20px;margin:20px 0}a{color:#194f9b}
.compare{display:flex;flex-wrap:wrap;gap:16px;align-items:start}.compare>div{max-width:100%;overflow-x:auto}
iframe{border:1px solid #bbc5d5;background:white;max-width:none}li{margin-bottom:5px}small{color:#52617a}
</style></head><body><main><h1>MailForge — final template visual review</h1>
<p>100 templates × 10 themes + modern/no-heading = 1,100 default previews. Separately: 5 structured-data cases × 10 themes = 50 test previews.</p>
<p><strong>Manual review required:</strong> compare hierarchy, spacing, wrapping, contrast, CTA placement, tables, and overflow at 600px and 375px. Open the theme-specific links to compare all palettes.</p>
<section><h2>12 design families — representative samples</h2><ol>${sampleLinks}</ol></section>${scenarioSections}
<p><small>These test fixtures are fictional DEMO data. Browser rendering is not certification for Gmail, Outlook, Apple Mail, dark-mode behavior or screen readers.</small></p></main></body></html>`;
const report = { generatedAt: new Date().toISOString(), baselineCount: manifest.entries.length,
  themeCount: themes.length, familyCount: review.samples.length, familySamples: review.samples,
  structuredCount: entries.length, cases: STRUCTURED_REVIEW_CASES.map(({ slug, id, category }) => ({ slug, id, category })),
  entries, errors, warnings, passed: errors.length === 0,
  limitations: ['Manual visual inspection required', 'Real email-client and assistive-technology validation not performed'],
};
await Promise.all([
  writeFile(path.join(out, 'index.html'), html),
  writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n'),
]);
console.log(`\nFinal visual-review matrix: ${entries.length}/50 additional previews, ${review.samples.length}/12 design families`);
console.log(`Errors: ${errors.length}; warnings: ${warnings.length}`);
console.log(`Gallery: ${path.join(out, 'index.html')}`);
for (const error of errors.slice(0, 25)) console.error(`FAIL ${error.sample}: ${error.message}`);
if (errors.length) process.exitCode = 1;
