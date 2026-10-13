/** Pure release-preview checks; no network, no parsing of executable HTML. */
import { Buffer } from 'node:buffer';

function unpackHtmlEntities(value) {
  return value.replace(/&#(?:x([0-9a-f]+)|([0-9]+));?/gi, (_match, hex, decimal) => {
    const code = Number.parseInt(hex ?? decimal, hex ? 16 : 10);
    return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  }).replace(/&(colon|tab|newline);/gi, (_match, name) => ({ colon: ':', tab: '\t', newline: '\n' })[name.toLowerCase()]);
}

function isUnsafeUrl(value) {
  const normalized = unpackHtmlEntities(value)
    .replace(/[\u0000-\u0020\u007f]+/g, '')
    .toLowerCase();
  return /^(?:javascript|vbscript|data|file):/.test(normalized);
}

/**
 * Return errors and warnings for one generated email (not a browser page).
 * These tests are intentionally a static QA gate, not a sanitizer.
 */
export function inspectEmailPreview({ html, text, entry, maxHtmlBytes = 1024 * 1024 }) {
  const errors = [];
  const warnings = [];
  const id = entry?.id ?? 'unknown';
  if (typeof html !== 'string' || !/<html\b/i.test(html) || !/<body\b/i.test(html)) {
    errors.push('Compiled email must contain html and body elements');
  }
  if (typeof html === 'string') {
    if (!/<html\b[^>]*\blang\s*=\s*["'][^"']+["']/i.test(html)) {
      errors.push('Missing html language attribute');
    }
    if (!/<html\b[^>]*\bdir\s*=\s*["'](?:ltr|rtl)["']/i.test(html)) {
      errors.push('Missing html direction attribute');
    }
    if (/<script\b/i.test(html)) errors.push('Executable script element found');
    if (/\s+on(?:load|error|click|mouseover|focus|submit)\s*=/i.test(html)) {
      errors.push('Inline event-handler attribute found');
    }
    for (const match of html.matchAll(/\bhref\s*=\s*(["'])(.*?)\1/gi)) {
      if (isUnsafeUrl(match[2])) errors.push('Unsafe link destination found');
    }
    for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
      if (!/\balt\s*=\s*(?:"[^"]*"|'[^']*')/i.test(match[0])) {
        errors.push('Image missing alt attribute (use alt="" for decorative images)');
      }
    }
    if (Buffer.byteLength(html, 'utf8') > maxHtmlBytes) {
      errors.push(`Generated HTML exceeds ${maxHtmlBytes} bytes`);
    }
    if (!/<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(html)) {
      warnings.push('Viewport meta tag not detected');
    }
    if (entry?.category === 'marketing' && !/unsubscribe/i.test(html)) {
      errors.push('Marketing preview is missing visible unsubscribe content');
    }
  }
  if (typeof text !== 'string' || !text.trim()) errors.push('Plain-text alternative is empty');
  if (typeof entry?.subject !== 'string' || !entry.subject.trim()) errors.push('Subject is empty');
  return { id, errors, warnings };
}

/** Check completeness and duplicate sample identities. */
export function inspectPreviewManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.entries)) {
    return ['Preview report is missing an entries array'];
  }
  if (!Number.isInteger(manifest.catalogCount) || manifest.catalogCount < 1) {
    errors.push('Invalid catalog count');
  }
  if (manifest.failed !== 0 || (manifest.errors?.length ?? 0) !== 0) {
    errors.push('Template preview generation reported rendering failures');
  }
  const expected = manifest.catalogCount * 4;
  if (manifest.entries.length !== expected) {
    errors.push(`Expected ${expected} template/theme samples but found ${manifest.entries.length}`);
  }
  const seen = new Set();
  for (const entry of manifest.entries) {
    if (!entry || typeof entry.id !== 'string' || typeof entry.theme !== 'string' || typeof entry.variant !== 'string') {
      errors.push('Invalid preview entry metadata');
      continue;
    }
    const key = `${entry.id}\0${entry.theme}\0${entry.variant}`;
    if (seen.has(key)) errors.push(`Duplicate preview entry: ${entry.id}/${entry.theme}/${entry.variant}`);
    seen.add(key);
  }
  return errors;
}
