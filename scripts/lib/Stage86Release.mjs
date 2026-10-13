/** Stage 8.6 release helpers. Pure: no filesystem writes, no network or publishing. */
import path from 'node:path';

export const EXPECTED_TEMPLATE_COUNT = 100;
export const EXPECTED_THEME_COUNT = 10;
export const CATEGORY_SCHEMAS = Object.freeze({
  account: 'accountCatalogTemplateDataSchema',
  authentication: 'authenticationCatalogTemplateDataSchema',
  billing: 'billingCatalogTemplateDataSchema',
  ecommerce: 'ecommerceCatalogTemplateDataSchema',
  marketing: 'marketingCatalogTemplateDataSchema',
  notifications: 'notificationCatalogTemplateDataSchema',
  events: 'eventCatalogTemplateDataSchema',
  saas: 'saasCatalogTemplateDataSchema',
  support: 'supportCatalogTemplateDataSchema',
});
export function validPackageExportPath(relative) {
  if (typeof relative !== 'string' || !relative.startsWith('./dist/')) return false;
  const normalized = path.posix.normalize(relative);
  return normalized === relative.slice(2) && !relative.includes('\\') &&
    !relative.includes('..') && relative !== './dist/';
}
export function inspectPackageManifest(manifest, dir) {
  const errors = [], blockers = [], warnings = [];
  const name = manifest?.name;
  if (typeof name !== 'string' || !name) errors.push(`${dir}: missing package name`);
  if (manifest?.private === true) blockers.push(`${dir}: private=true (not publishable)`);
  if (!manifest?.version) errors.push(`${dir}: missing package version`);
  if (!manifest?.license) warnings.push(`${dir}: missing license metadata`);
  const isLibrary = typeof name === 'string' && name.startsWith('@mailforge/') && dir.startsWith('packages/');
  if (isLibrary) {
    const entry = manifest?.exports?.['.'];
    if (!entry || !validPackageExportPath(entry.import) || !validPackageExportPath(entry.types)) {
      errors.push(`${dir}: root ESM/type exports must target ./dist/...`);
    }
    if (manifest?.type !== 'module') errors.push(`${dir}: expected ESM package`);
    if (!Array.isArray(manifest?.files) || !manifest.files.includes('dist')) {
      errors.push(`${dir}: dist missing from package files allowlist`);
    }
    if (manifest.main !== entry?.import || manifest.types !== entry?.types) {
      errors.push(`${dir}: main/types disagree with package exports`);
    }
    if (manifest?.private !== true && !manifest?.publishConfig?.access && name.startsWith('@')) {
      warnings.push(`${dir}: public scoped npm publishing requires deliberate access configuration`);
    }
  }
  for (const [dep, version] of Object.entries(manifest?.dependencies ?? {})) {
    if (dep.startsWith('@mailforge/') && !String(version).startsWith('workspace:')) {
      warnings.push(`${dir}: internal dependency ${dep} is not a workspace reference`);
    }
  }
  return { errors, blockers, warnings, isLibrary };
}
export function inspectPackageGraph(packages) {
  const errors = [], blockers = [], warnings = [];
  const seen = new Set();
  const byName = new Map();
  for (const { dir, manifest } of packages) {
    const result = inspectPackageManifest(manifest, dir);
    errors.push(...result.errors); blockers.push(...result.blockers); warnings.push(...result.warnings);
    if (seen.has(manifest.name)) errors.push(`Duplicate package: ${manifest.name}`);
    seen.add(manifest.name); byName.set(manifest.name, { dir, manifest });
  }
  for (const { dir, manifest } of packages) {
    for (const dep of Object.keys(manifest.dependencies ?? {})) {
      if (!dep.startsWith('@mailforge/')) continue;
      const target = byName.get(dep);
      if (!target) errors.push(`${dir}: unknown internal dependency ${dep}`);
      else if (manifest.private !== true && target.manifest.private === true) {
        blockers.push(`${dir}: public package depends on private ${dep}`);
      }
    }
  }
  return { errors, blockers: [...new Set(blockers)], warnings };
}
export function schemaFieldRows(schema) {
  const shape = schema?.shape;
  if (!shape || typeof shape !== 'object') return [];
  return Object.entries(shape).map(([key, value]) => {
    const optional = typeof value.isOptional === 'function' && value.isOptional();
    const nested = value?.shape ?? value?.unwrap?.()?.shape;
    const children = nested && typeof nested === 'object'
      ? Object.keys(nested).join(', ') : '';
    return { key, required: !optional, children };
  });
}
export function escapeMd(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ').replaceAll('\r', ' ');
}
export function docsFromCatalog({ catalog, themes, categories, components, runtimeExports }) {
  if (!Array.isArray(catalog) || catalog.length !== EXPECTED_TEMPLATE_COUNT) {
    throw new Error(`Expected ${EXPECTED_TEMPLATE_COUNT} unique built-in template entries`);
  }
  if (new Set(catalog.map(row => row.id)).size !== EXPECTED_TEMPLATE_COUNT) {
    throw new Error('Duplicate built-in template IDs');
  }
  if (!Array.isArray(themes) || themes.length !== EXPECTED_THEME_COUNT ||
      new Set(themes).size !== EXPECTED_THEME_COUNT) throw new Error('Expected ten distinct themes');
  const sorted = [...catalog].sort((a,b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
  const table = sorted.map(row => `| \`${escapeMd(row.id)}\` | ${escapeMd(row.category)} | ${escapeMd(row.title)} | ${escapeMd(row.description)} |`);
  const templateMd = [
    '# Built-in templates (generated from the installed MailForge build)', '',
    '> Generated by `node scripts/stage86-release.mjs --docs`. Do not edit manually.',
    '> All 100 IDs are registered in `createEmail().listBuiltinCatalog()`.', '',
    '| ID | Category | Title | Description |', '| --- | --- | --- | --- |', ...table, '',
    '## Category-specific data contracts', '',
    'Contracts listed below are derived from exported Zod schemas. Cross-field validation',
    '(such as a paired currency and amount, valid timestamps and unsubscribe URL)',
    'still runs in the library; this table is not a substitute for the actual schema.', '',
  ];
  for (const [category, details] of Object.entries(categories)) {
    templateMd.push(`### ${category}`, '', `Source export: \`${escapeMd(details.exportName)}\``, '',
      '| Field | Required | Nested keys (when applicable) |', '| --- | --- | --- |',
      ...details.fields.map(field => `| \`${escapeMd(field.key)}\` | ${field.required ? 'Yes' : 'No'} | ${escapeMd(field.children)} |`), '');
  }
  templateMd.push('For specialized and original templates, consult `packages/template/src/DomainTemplateData.ts`,',
    '`packages/template/src/TemplateData.ts`, and their individual exported validation schemas.',
    'All example values in documentation must be provided by the caller; MailForge does not invent transactions.', '');
  const themesMd = ['# Theme reference', '',
    '> Generated directly from `@mailforge/themes`. Theme customization remains public and supported.', '',
    ...themes.map(t => `- \`${escapeMd(t)}\``), '',
    'Use `createEmail({ theme: { preset: "modern" } })`, or configure theme overrides using',
    '`resolveEmailTheme`, `mergeEmailTheme`, and `defineThemeOverrides`.',
    'Email-client dark-mode handling must be tested in actual clients before certification.', ''];
  const componentsMd = ['# Reusable component reference', '',
    '> Generated from the registered component-name constants in `@mailforge/components`.', '',
    ...Object.entries(components).flatMap(([name, ids]) => [
      `## ${name}`, '', ...ids.map(id => `- \`${escapeMd(id)}\``), '',
    ]),
    'Use `createEmail().registerComponent()` to add project-specific reusable components.',
    'Business components only render values provided and validated by the application.', ''];
  const apiMd = ['# Public API reference', '',
    '> Runtime exports below come from built packages. Source TypeScript types are available in',
    '> their respective `src/index.ts` files and generated `dist/index.d.ts` declarations.', '',
    '## Quick start', '', '```ts',
    'import { createEmail } from "@mailforge/email";',
    'const engine = createEmail({ brand: { name: "Example", supportEmail: "support@example.com" } });',
    'const result = await engine.render("welcome", { data: {',
    '  user: { firstName: "Sam" },',
    '  actionUrl: "https://example.com/dashboard",',
    '} });',
    'console.log(result.html, result.text);', '```', '',
    '## Package exports (runtime)', '',
    ...Object.entries(runtimeExports).flatMap(([pkg, names]) => [
      `### \`${escapeMd(pkg)}\``, '',
      ...names.map(name => `- \`${escapeMd(name)}\``), '',
    ]),
    '## Important behavior', '',
    '- Rendering and email delivery are separate; delivery is optional.',
    '- Untrusted HTML and URLs must pass the existing sanitizers and validators.',
    '- Keep `createEmail()` engines isolated per tenant when registering extensions.',
    '- Built-in IDs, customizations, theme overrides, variants and versions are public compatibility commitments.', ''];
  return {
    'docs/TEMPLATES.md': templateMd.join('\n'),
    'docs/THEMES.md': themesMd.join('\n'),
    'docs/COMPONENTS.md': componentsMd.join('\n'),
    'docs/API.md': apiMd.join('\n'),
  };
}
