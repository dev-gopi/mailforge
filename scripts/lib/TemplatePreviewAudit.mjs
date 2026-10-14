/** Invariant-based checks for the generated built-in template preview matrix. */
export function auditPreviewManifest(manifest, catalog, themes) {
  const errors = [];
  const warnings = [];
  if (!Array.isArray(catalog) || !Array.isArray(themes) || !catalog.length || !themes.length) {
    return { errors: ["A nonempty catalog and theme list are required"], warnings, expected: 0 };
  }
  const ids = catalog.map((item) => item.id);
  const uniqueIds = new Set(ids);
  const uniqueThemes = new Set(themes);
  if (uniqueIds.size !== ids.length) errors.push("Duplicate built-in template IDs");
  if (uniqueThemes.size !== themes.length) errors.push("Duplicate theme names");
  if (!uniqueIds.has("report-ready") || !uniqueIds.has("activity-notification") || !uniqueIds.has("password-reset-secure") || !uniqueIds.has("order-shipped-notice") || !uniqueIds.has("workspace-invitation-editorial")) {
    errors.push("The compiled catalog must preserve report-ready, activity-notification, password-reset-secure, order-shipped-notice and workspace-invitation-editorial");
  }
  if (uniqueIds.size < 105) errors.push(`Expected at least 105 built-in IDs; found ${uniqueIds.size}`);

  const expected = new Map();
  for (const id of uniqueIds) {
    for (const theme of uniqueThemes) {
      for (const variant of theme === "modern" ? ["default", "no-heading"] : ["default"]) {
        const slug = `${id}--${theme}--${variant}`;
        expected.set(slug, { id, theme, variant,
          html: `previews/${slug}.html`, text: `previews/${slug}.txt` });
      }
    }
  }
  if (!manifest || typeof manifest !== "object") {
    return { errors: [...errors, "Invalid or missing preview manifest"], warnings, expected: expected.size };
  }
  if (manifest.catalogCount !== uniqueIds.size) {
    errors.push(`Manifest catalogCount ${String(manifest.catalogCount)} != compiled catalog ${uniqueIds.size}`);
  }
  if (!Array.isArray(manifest.entries)) {
    errors.push("Manifest entries must be an array");
    return { errors, warnings, expected: expected.size };
  }
  if (manifest.failed !== 0 || (Array.isArray(manifest.errors) && manifest.errors.length)) {
    errors.push(`Preview generation reported failures: ${String(manifest.failed)}`);
  }
  const seen = new Set();
  for (const row of manifest.entries) {
    if (!row || typeof row !== "object") {
      errors.push("Invalid preview manifest entry");
      continue;
    }
    const key = `${row.id}--${row.theme}--${row.variant}`;
    const want = expected.get(key);
    if (!want) { errors.push(`Unexpected preview: ${key}`); continue; }
    if (seen.has(key)) { errors.push(`Duplicate preview: ${key}`); continue; }
    seen.add(key);
    if (row.html !== want.html || row.text !== want.text) {
      errors.push(`Invalid output file paths for ${key}`);
    }
    if (row.status !== "pass") errors.push(`Preview not marked pass: ${key}`);
    if (!Number.isInteger(row.htmlBytes) || row.htmlBytes <= 0 ||
        !Number.isInteger(row.textBytes) || row.textBytes <= 0) {
      errors.push(`Invalid output sizes for ${key}`);
    }
    if (Array.isArray(row.warnings) && row.warnings.length) {
      warnings.push(`${key}: ${row.warnings.length} renderer warning(s)`);
    }
  }
  for (const slug of expected.keys()) {
    if (!seen.has(slug)) errors.push(`Missing preview: ${slug}`);
  }
  if (manifest.entries.length !== expected.size) {
    errors.push(`Expected ${expected.size} previews but found ${manifest.entries.length}`);
  }
  if (manifest.successful !== manifest.entries.length) {
    errors.push("Manifest successful count disagrees with entries");
  }
  return { errors, warnings, expected: expected.size };
}
