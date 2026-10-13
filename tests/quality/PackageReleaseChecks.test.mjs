import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkPackage, entrypointPath, exportTargets, nodeRuntimeStatus } from '../../scripts/lib/PackageReleaseChecks.mjs';

const manifest = { name: '@mailforge/demo', version: '0.1.0', private: true,
  type: 'module', main: './dist/index.js', types: './dist/index.d.ts',
  exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } } };

test('accepts a supported Node runtime and rejects older versions', () => {
  assert.equal(nodeRuntimeStatus('20.19.0').supported, true);
  assert.equal(nodeRuntimeStatus('22.0.0').supported, true);
  assert.equal(nodeRuntimeStatus('20.18.9').supported, false);
  assert.equal(nodeRuntimeStatus('18.20.0').supported, false);
});
test('rejects invalid versions rather than guessing', () => {
  assert.throws(() => nodeRuntimeStatus('not-a-version'));
});
test('rejects package export path traversal', () => {
  assert.throws(() => entrypointPath('/tmp/pkg', './../secret.js'), /escapes/);
  assert.throws(() => entrypointPath('/tmp/pkg', '/tmp/secret.js'), /Invalid/);
});
test('requires both public entrypoints', () => {
  assert.deepEqual(exportTargets(manifest), { import: './dist/index.js', types: './dist/index.d.ts' });
  assert.throws(() => exportTargets({ exports: { '.': { import: './dist/index.js' } } }), /types/);
});
test('checks built package without importing unrelated application code', async () => {
  const folder = await mkdtemp(path.join(tmpdir(), 'mf-package-check-'));
  try {
    await mkdir(path.join(folder, 'dist'));
    await writeFile(path.join(folder, 'package.json'), JSON.stringify(manifest));
    await writeFile(path.join(folder, 'dist/index.js'), 'export const sample = 1;\n');
    await writeFile(path.join(folder, 'dist/index.d.ts'), 'export declare const sample: number;\n');
    assert.deepEqual((await checkPackage(folder)).errors, []);
  } finally { await rm(folder, { recursive: true, force: true }); }
});
test('detects a missing declaration output', async () => {
  const folder = await mkdtemp(path.join(tmpdir(), 'mf-package-check-'));
  try {
    await mkdir(path.join(folder, 'dist'));
    await writeFile(path.join(folder, 'package.json'), JSON.stringify(manifest));
    await writeFile(path.join(folder, 'dist/index.js'), 'export {};\n');
    assert.ok((await checkPackage(folder, { importBuilt: false })).errors.some(error => error.includes('types entrypoint')));
  } finally { await rm(folder, { recursive: true, force: true }); }
});
