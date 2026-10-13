import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  EXPECTED_TEMPLATE_COUNT, inspectPackageManifest, inspectPackageGraph,
  validPackageExportPath, docsFromCatalog, schemaFieldRows, escapeMd,
} from '../../scripts/lib/Stage86Release.mjs';

const manifest = (name, privateFlag = false) => ({
  name, private: privateFlag, version: '0.1.0', license: 'MIT', type: 'module',
  main: './dist/index.js', types: './dist/index.d.ts',
  exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } },
  files: ['dist'], dependencies: {},
});
test('template count is locked at 100', () => assert.equal(EXPECTED_TEMPLATE_COUNT, 100));
test('safe export paths must remain inside dist', () => {
  for (const value of ['./dist/index.js', './dist/index.d.ts']) assert.ok(validPackageExportPath(value));
  for (const value of ['../secret', './src/index.ts', './dist/../secrets', '/tmp/value', './dist\\x']) {
    assert.ok(!validPackageExportPath(value), value);
  }
});
test('manifest audit accepts a consistent public package', () => {
  const result = inspectPackageManifest(manifest('@mailforge/core'), 'packages/core');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.blockers, []);
});
test('private packages are always publishing blockers', () => {
  const result = inspectPackageManifest(manifest('@mailforge/email', true), 'packages/email');
  assert.match(result.blockers.join(' '), /private=true/);
});
test('missing exports are errors rather than silent warnings', () => {
  const pkg = manifest('@mailforge/test');
  delete pkg.exports;
  assert.match(inspectPackageManifest(pkg, 'packages/test').errors.join(' '), /root ESM/);
});
test('public packages cannot be released with private dependencies', () => {
  const p = manifest('@mailforge/public');
  p.dependencies['@mailforge/hidden'] = 'workspace:*';
  const result = inspectPackageGraph([
    { dir: 'packages/public', manifest: p },
    { dir: 'packages/hidden', manifest: manifest('@mailforge/hidden', true) },
  ]);
  assert.match(result.blockers.join(' '), /depends on private/);
});
test('unknown internal package references are errors', () => {
  const p = manifest('@mailforge/public');
  p.dependencies['@mailforge/missing'] = 'workspace:*';
  const result = inspectPackageGraph([{ dir: 'packages/public', manifest: p }]);
  assert.match(result.errors.join(' '), /unknown internal dependency/);
});
test('docs describe required and nested optional fields', () => {
  const schema = {
    shape: { recipientName: { isOptional: () => false }, billing: {
      isOptional: () => true, unwrap: () => ({ shape: { amount: {}, currency: {} } }),
    } },
  };
  assert.deepEqual(schemaFieldRows(schema), [
    { key: 'recipientName', required: true, children: '' },
    { key: 'billing', required: false, children: 'amount, currency' },
  ]);
});
test('documentation detects duplicate IDs and wrong theme count', () => {
  const catalog = Array.from({ length: 100 }, (_, i) => ({ id: `id-${i}`, category: 'account', title: 'A', description: 'B' }));
  const themes = Array.from({ length: 10 }, (_, i) => `theme-${i}`);
  const args = { catalog, themes, categories: {}, components: {}, runtimeExports: {} };
  const output = docsFromCatalog(args);
  assert.ok(output['docs/TEMPLATES.md'].includes('id-99'));
  assert.throws(() => docsFromCatalog({ ...args, themes: ['modern'] }), /ten distinct themes/);
  assert.throws(() => docsFromCatalog({ ...args, catalog: [...catalog.slice(1), catalog[1]] }), /Duplicate/);
});
test('markdown metadata is escaped before writing tables', () => {
  assert.equal(escapeMd('x|y\nz'), 'x\\|y z');
});
