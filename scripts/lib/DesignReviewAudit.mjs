/** Structural review matrix for the 100-template, 10-theme preview generator.
 * Review samples are prompts for human inspection, not visual certification.
 */
export const DESIGN_FAMILIES = Object.freeze([
  'editorial', 'spotlight', 'receipt', 'ledger', 'delivery', 'showcase',
  'ticket', 'invitation', 'dashboard', 'conversation', 'security', 'minimal',
]);

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

export function safePreviewPath(value) {
  return typeof value === 'string' &&
    /^previews\/[a-zA-Z0-9_-]+--[a-zA-Z0-9_-]+--(?:default|no-heading)\.html$/.test(value) &&
    !value.includes('..');
}

export function reviewGallery(manifest, catalog, themes, familyFor) {
  const errors = [];
  const samples = [];
  const summary = { templateCount: 0, themeCount: 0, defaultCount: 0 };
  if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.entries) ||
      !Array.isArray(catalog) || !Array.isArray(themes) || typeof familyFor !== 'function') {
    return { errors: ['Invalid preview manifest or catalog'], samples, summary };
  }
  summary.templateCount = catalog.length;
  summary.themeCount = themes.length;
  if (manifest.catalogCount !== catalog.length) errors.push('Unexpected catalog count');
  if (manifest.failed !== 0 || (Array.isArray(manifest.errors) && manifest.errors.length)) {
    errors.push('Preview generation reported failures');
  }
  const ids = new Set(catalog.map(item => item.id));
  const themesSet = new Set(themes);
  if (ids.size !== catalog.length || themesSet.size !== themes.length) {
    errors.push('Duplicate catalog ID or theme');
  }
  const seen = new Set();
  for (const entry of manifest.entries) {
    if (!entry || typeof entry !== 'object' || !ids.has(entry.id) ||
        !themesSet.has(entry.theme) || !['default', 'no-heading'].includes(entry.variant)) {
      errors.push('Unexpected preview manifest entry');
      continue;
    }
    if (!safePreviewPath(entry.html)) errors.push(`Unsafe preview path for ${entry.id}`);
    const key = `${entry.id}\u0000${entry.theme}\u0000${entry.variant}`;
    if (seen.has(key)) errors.push(`Duplicate preview: ${entry.id} / ${entry.theme} / ${entry.variant}`);
    seen.add(key);
    if (entry.variant === 'default') summary.defaultCount += 1;
  }
  for (const item of catalog) {
    for (const theme of themes) {
      if (!seen.has(`${item.id}\u0000${theme}\u0000default`)) {
        errors.push(`Missing default preview: ${item.id} / ${theme}`);
      }
    }
  }
  for (const [index, family] of DESIGN_FAMILIES.entries()) {
    let matched;
    for (const item of catalog) {
      try {
        if (familyFor(item.id, item.category) === family) {
          matched = item;
          break;
        }
      } catch (error) {
        errors.push(`Could not determine design family for ${item.id}: ${String(error)}`);
        break;
      }
    }
    if (!matched) {
      errors.push(`Design family has no templates: ${family}`);
      continue;
    }
    const theme = themes[index % themes.length];
    const entry = manifest.entries.find(row => row && row.id === matched.id && row.theme === theme && row.variant === 'default');
    if (entry && safePreviewPath(entry.html)) {
      samples.push({ id: matched.id, category: matched.category, family, theme, html: entry.html });
    }
  }
  return { errors, samples, summary };
}
