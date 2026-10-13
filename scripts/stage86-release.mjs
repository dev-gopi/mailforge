#!/usr/bin/env node
/** Stage 8.6 readiness: audit, source-derived docs and optional LOCAL pack validation.
 * No npm publication, network APIs, version changes or package metadata rewrites.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  CATEGORY_SCHEMAS, inspectPackageGraph, schemaFieldRows, docsFromCatalog,
  validPackageExportPath,
} from './lib/Stage86Release.mjs';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const modes = ['--docs', '--check-docs', '--audit', '--pack'];
if ([...args].some(a => !modes.includes(a)) || !args.size) {
  console.error('Usage: node scripts/stage86-release.mjs --docs | --check-docs | --audit [--pack]');
  process.exit(2);
}
const load = async rel => JSON.parse(await fs.readFile(path.join(root, rel), 'utf8'));
const exists = async rel => fs.access(path.join(root, rel)).then(() => true, () => false);
const rootManifest = await load('package.json');
if (rootManifest.packageManager !== 'pnpm@10.34.7' || !rootManifest.private) {
  throw new Error('Repository package manager/private status drift; inspect before releasing');
}
if (!(await exists('packages/template/package.json'))) throw new Error('Expected singular packages/template');
if (!(await exists('pnpm-lock.yaml'))) throw new Error('Missing root lockfile');
const dirs = [];
for (const dir of ['packages', 'apps']) {
  if (!(await exists(dir))) continue;
  for (const entry of await fs.readdir(path.join(root, dir), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const rel = `${dir}/${entry.name}`;
    if (await exists(`${rel}/package.json`)) dirs.push(rel);
  }
}
const packages = await Promise.all(dirs.sort().map(async dir => ({ dir, manifest: await load(`${dir}/package.json`) })));
const report = inspectPackageGraph(packages);
for (const { dir, manifest } of packages) {
  if (!dir.startsWith('packages/') || !manifest.name?.startsWith('@mailforge/')) continue;
  for (const [label, file] of Object.entries(manifest.exports?.['.'] ?? {})) {
    if (!validPackageExportPath(file)) { report.errors.push(`${dir}: unsafe ${label} export`); continue; }
    if (!(await exists(`${dir}/${file.slice(2)}`))) report.errors.push(`${dir}: missing built export ${file}`);
  }
}
const makeDocs = async () => {
  const template = await import(pathToFileURL(path.join(root, 'packages/template/dist/index.js')).href);
  const email = await import(pathToFileURL(path.join(root, 'packages/email/dist/index.js')).href);
  const component = await import(pathToFileURL(path.join(root, 'packages/components/dist/index.js')).href);
  const themesPkg = await import(pathToFileURL(path.join(root, 'packages/themes/dist/index.js')).href);
  const catalog = email.createEmail().listBuiltinCatalog();
  const themes = themesPkg.listThemePresets();
  const categories = {};
  for (const [name, exportName] of Object.entries(CATEGORY_SCHEMAS)) {
    if (!template[exportName]) throw new Error(`Missing category schema ${exportName}`);
    categories[name] = { exportName, fields: schemaFieldRows(template[exportName]) };
  }
  const names = {
    Standard: component.STANDARD_COMPONENT_NAMES,
    Composite: component.COMPOSITE_COMPONENT_NAMES,
    Extended: component.EXTENDED_COMPONENT_NAMES,
    Professional: component.PROFESSIONAL_COMPONENT_NAMES,
    Business: component.BUSINESS_COMPONENT_NAMES,
  };
  const components = {};
  for (const [name, values] of Object.entries(names)) {
    if (!Array.isArray(values)) throw new Error(`Component-name registry missing: ${name}`);
    components[name] = [...new Set(values)].sort();
  }
  const runtimeExports = {};
  for (const [name, target] of [
    ['@mailforge/email', email], ['@mailforge/templates', template],
    ['@mailforge/themes', themesPkg], ['@mailforge/components', component],
  ]) runtimeExports[name] = Object.keys(target).sort();
  return docsFromCatalog({ catalog, themes, categories, components, runtimeExports });
};
if (args.has('--docs') || args.has('--check-docs')) {
  const docs = await makeDocs();
  for (const [rel, content] of Object.entries(docs)) {
    if (args.has('--docs')) {
      if (await exists(rel) && (await fs.readFile(path.join(root, rel), 'utf8')) !== content) {
        throw new Error(`Refusing to overwrite changed docs: ${rel}. Investigate differences first.`);
      }
      await fs.mkdir(path.dirname(path.join(root, rel)), { recursive: true });
      await fs.writeFile(path.join(root, rel), content, { flag: 'w' });
      console.log(`GENERATED ${rel}`);
    } else if (!(await exists(rel)) || (await fs.readFile(path.join(root, rel), 'utf8')) !== content) {
      report.errors.push(`Generated reference documentation is stale: ${rel}`);
    }
  }
}
if (args.has('--audit') || args.has('--check-docs')) {
  const snapshot = {
    date: new Date().toISOString(), packageManager: rootManifest.packageManager,
    packageCount: packages.length, packageNames: packages.map(p => p.manifest.name),
    publishReady: report.blockers.length === 0 && report.errors.length === 0,
    ...report,
    note: 'A clean audit is not actual email-client certification or authorization to publish.',
  };
  const reportDir = path.join(root, 'generated/release');
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(path.join(reportDir, 'stage86-audit.json'), JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`Stage 8.6: ${packages.length} packages, ${report.errors.length} errors, ${report.blockers.length} publishing blockers, ${report.warnings.length} warnings`);
  console.log('Report: generated/release/stage86-audit.json');
  for (const error of report.errors) console.error(`ERROR ${error}`);
  for (const blocker of report.blockers) console.log(`PUBLISH-BLOCKER ${blocker}`);
  for (const warning of report.warnings) console.log(`WARN ${warning}`);
  if (report.errors.length) process.exitCode = 1;
}
if (args.has('--pack')) {
  if (report.errors.length) throw new Error('Cannot pack while release audit has errors');
  const out = path.join(root, 'generated/release/tarballs');
  await fs.mkdir(out, { recursive: true });
  for (const { dir, manifest } of packages) {
    if (!dir.startsWith('packages/') || !manifest.name.startsWith('@mailforge/') || manifest.private) continue;
    const localDeps = Object.keys(manifest.dependencies ?? {}).filter(d => d.startsWith('@mailforge/'));
    const privateDeps = localDeps.filter(dep => packages.some(p => p.manifest.name === dep && p.manifest.private));
    if (privateDeps.length) {
      console.log(`SKIP ${manifest.name}: dependencies not publishable (${privateDeps.join(', ')})`);
      continue;
    }
    console.log(`PACK LOCAL ${manifest.name}`);
    const packed = spawnSync('npx', ['--yes', 'pnpm@10.34.7', 'pack', '--pack-destination', out], {
      cwd: path.join(root, dir), stdio: 'inherit', shell: false,
    });
    if (packed.status !== 0) throw new Error(`Local pack failed: ${manifest.name}`);
    const tarName = `${manifest.name.replace(/^@/, '').replace('/', '-')}-${manifest.version}.tgz`;
    const tarPath = path.join(out, tarName);
    if (!(await exists(path.relative(root, tarPath)))) throw new Error(`Tarball missing: ${tarName}`);
    const contents = spawnSync('tar', ['-tf', tarPath], { encoding: 'utf8' });
    if (contents.status !== 0) throw new Error(`Cannot inspect tarball: ${tarName}`);
    const entries = new Set(contents.stdout.split('\n').map(item => item.replace(/^\.\//, '')));
    const expected = ['package/package.json',
      `package/${manifest.exports['.'].import.slice(2)}`,
      `package/${manifest.exports['.'].types.slice(2)}`];
    for (const rel of expected) {
      if (!entries.has(rel)) throw new Error(`${tarName} missing packed artifact ${rel}`);
    }
    const packedManifest = spawnSync('tar', ['-xOf', tarPath, 'package/package.json'], { encoding: 'utf8' });
    if (packedManifest.status !== 0) throw new Error(`Cannot read packed manifest: ${tarName}`);
    const shipped = JSON.parse(packedManifest.stdout);
    if (shipped.name !== manifest.name || shipped.version !== manifest.version) {
      throw new Error(`Packed identity mismatch: ${tarName}`);
    }
    for (const value of Object.values(shipped.dependencies ?? {})) {
      if (String(value).startsWith('workspace:')) throw new Error(`Unresolved workspace dependency in ${tarName}`);
    }
    console.log(`VERIFIED ${tarName}: manifest, runtime JS, declarations, workspace dependencies`);
  }
  console.log(`Local tarballs: ${path.relative(root, out)} (not published)`);
}
