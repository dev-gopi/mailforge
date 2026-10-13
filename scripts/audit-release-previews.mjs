#!/usr/bin/env node
/** Audit real output from scripts/generate-all-template-previews.mjs. */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { inspectEmailPreview, inspectPreviewManifest } from './lib/PreviewQuality.mjs';
import { listThemePresets } from '../packages/email/dist/index.js';

const root = path.resolve(process.argv[2] ?? 'generated/template-audit');
const manifest = JSON.parse(await readFile(path.join(root, 'report.json'), 'utf8'));
const errors = inspectPreviewManifest(manifest, listThemePresets()).map(message => ({ id: '(catalog)', message }));
const warnings = [];
const resolveSafe = relative => {
  if (typeof relative !== 'string' || !relative) throw new Error('Missing preview output path');
  const absolute = path.resolve(root, relative);
  if (!absolute.startsWith(root + path.sep)) throw new Error('Preview file path escapes its output folder');
  return absolute;
};
for (const entry of manifest.entries ?? []) {
  try {
    const [html, text] = await Promise.all([
      readFile(resolveSafe(entry.html), 'utf8'),
      readFile(resolveSafe(entry.text), 'utf8'),
    ]);
    const result = inspectEmailPreview({ html, text, entry });
    errors.push(...result.errors.map(message => ({ id: entry.id, theme: entry.theme, variant: entry.variant, message })));
    warnings.push(...result.warnings.map(message => ({ id: entry.id, theme: entry.theme, variant: entry.variant, message })));
  } catch (error) {
    errors.push({ id: entry.id ?? '(unknown)', message: error instanceof Error ? error.message : String(error) });
  }
}
const report = {
  generatedAt: new Date().toISOString(),
  previewCount: manifest.entries?.length ?? 0,
  catalogCount: manifest.catalogCount ?? 0,
  passed: errors.length === 0,
  errors,
  warnings,
  disclaimer: 'Static structural checks only. Real Gmail, Outlook, Apple Mail and assistive technology tests remain required.',
};
await writeFile(path.join(root, 'release-quality-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`MailForge quality gate: ${report.previewCount} previews, ${errors.length} errors, ${warnings.length} warnings`);
console.log(`Report: ${path.join(root, 'release-quality-report.json')}`);
for (const item of errors.slice(0, 20)) console.error(`FAIL ${item.id}: ${item.message}`);
if (errors.length) process.exitCode = 1;
