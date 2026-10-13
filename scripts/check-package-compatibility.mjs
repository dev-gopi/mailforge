#!/usr/bin/env node
/** Stage 8.5 package build and runtime compatibility audit. Run after pnpm build. */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { checkPackage, nodeRuntimeStatus } from './lib/PackageReleaseChecks.mjs';

const root = process.cwd();
const rootManifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (rootManifest.name !== 'mailforge-monorepo') throw new Error('Run from the MailForge monorepo root');
const runtime = nodeRuntimeStatus();
const packageRoot = path.join(root, 'packages');
const directoryNames = (await readdir(packageRoot, { withFileTypes: true }))
  .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
const packages = [];
for (const name of directoryNames) {
  const dir = path.join(packageRoot, name);
  try { await readFile(path.join(dir, 'package.json')); }
  catch { continue; /* intentional scaffolds (preview/testing) are not packages yet */ }
  packages.push(await checkPackage(dir));
}
const errors = packages.flatMap(pkg => pkg.errors.map(message => `${pkg.name}: ${message}`));
if (!runtime.supported) errors.unshift(`Unsupported Node runtime ${runtime.version}; minimum is 20.19.0`);
const report = {
  generatedAt: new Date().toISOString(), node: runtime, packages,
  passed: errors.length === 0, errors,
  manualMatrix: ['Node 20.19+', 'Node 22 LTS', 'Node 24 LTS', 'Ubuntu', 'Windows', 'macOS'],
  note: 'Only the current Node/OS environment was executed; this is not a multi-platform certification.',
};
const output = path.join(root, 'generated/template-audit/package-compatibility-report.json');
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
for (const pkg of packages) {
  console.log(`${pkg.errors.length ? 'FAIL' : 'PASS'} ${pkg.name}${pkg.private ? ' (private)' : ''}`);
  for (const error of pkg.errors) console.error(`  ERROR ${error}`);
  for (const warning of pkg.warnings) console.log(`  NOTE ${warning}`);
}
console.log(`Node ${runtime.version}; ${packages.length} workspace packages inspected`);
console.log(`Report: ${output}`);
if (errors.length) process.exitCode = 1;
