/** Source-independent checks for MailForge package manifests and build entrypoints. */
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const within = (root, candidate) => candidate !== root && candidate.startsWith(root + path.sep);

/** Package-owned export targets must be explicit relative paths under the package root. */
export function entrypointPath(packageDir, declared) {
  if (typeof declared !== 'string' || !declared.startsWith('./')) {
    throw new Error(`Invalid package export target: ${String(declared)}`);
  }
  const root = path.resolve(packageDir);
  const candidate = path.resolve(root, declared);
  if (!within(root, candidate)) throw new Error(`Package export escapes package root: ${declared}`);
  return candidate;
}

export function exportTargets(manifest) {
  const entry = manifest.exports?.['.'];
  if (!entry) throw new Error('Missing public "." export');
  if (typeof entry === 'string') return { import: entry, types: manifest.types };
  if (typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Invalid public export map');
  const importPath = entry.import ?? entry.default;
  if (typeof importPath !== 'string' || typeof entry.types !== 'string') {
    throw new Error('Public export must declare import and types targets');
  }
  return { import: importPath, types: entry.types };
}

export async function checkPackage(packageDir, { importBuilt = true } = {}) {
  const errors = [];
  const warnings = [];
  let manifest;
  try {
    manifest = JSON.parse(await readFile(path.join(packageDir, 'package.json'), 'utf8'));
  } catch (error) {
    return { name: path.basename(packageDir), errors: [`Unreadable package manifest: ${String(error)}`], warnings };
  }
  const name = manifest.name ?? path.basename(packageDir);
  if (!String(name).startsWith('@mailforge/')) errors.push('Unexpected package name');
  if (manifest.type !== 'module') errors.push('Expected ESM package (type=module)');
  if (manifest.private === true) warnings.push('private=true: npm publishing is intentionally blocked');
  if (typeof manifest.version !== 'string') errors.push('Missing package version');
  if (manifest.main && manifest.main !== manifest.exports?.['.']?.import) {
    warnings.push('main differs from the public import export');
  }
  let targets;
  try {
    targets = exportTargets(manifest);
  } catch (error) {
    errors.push(error.message);
  }
  if (targets) {
    for (const [kind, declared] of Object.entries(targets)) {
      try {
        const target = entrypointPath(packageDir, declared);
        await access(target);
        if (kind === 'types' && !target.endsWith('.d.ts')) errors.push('Type entrypoint is not .d.ts');
        if (kind === 'import' && importBuilt) {
          try { await import(pathToFileURL(target).href); }
          catch (error) { errors.push(`ESM import failed: ${error instanceof Error ? error.message : String(error)}`); }
        }
      } catch (error) { errors.push(`${kind} entrypoint invalid or missing: ${error.message}`); }
    }
  }
  for (const binTarget of Object.values(manifest.bin ?? {})) {
    try { await access(entrypointPath(packageDir, binTarget)); }
    catch (error) { errors.push(`CLI bin missing: ${error.message}`); }
  }
  return { name, errors, warnings, private: manifest.private === true };
}

/** Runtime is tested on the currently running Node; other versions require CI runs. */
export function nodeRuntimeStatus(version = process.versions.node) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Invalid Node version: ${version}`);
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  return { version, supported: major > 20 || (major === 20 && (minor > 19 || (minor === 19 && patch >= 0))) };
}
