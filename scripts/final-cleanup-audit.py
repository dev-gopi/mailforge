#!/usr/bin/env python3
"""MailForge final repository audit. Read-only except ignored generated reports.

Only explicitly safe findings count as errors. Exact duplicates and
possible orphan sources are REVIEW-ONLY, never automatic delete candidates.
"""
from __future__ import annotations
import argparse
from collections import defaultdict
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys

SKIP_PARTS = frozenset({'.git','node_modules','dist','coverage','generated','.turbo','.next','.cache','__pycache__'})
SOURCE_SUFFIXES = frozenset({'.ts','.tsx','.js','.jsx','.mjs','.cjs'})
LINT_TERMS = re.compile(r'\b(?:TODO|FIXME|XXX|NotImplementedError)\b|throw\s+new\s+Error\s*\(\s*[\x27\x22]Not implemented', re.I)
IMPORT_RE = re.compile(r'(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s*)([\x27\x22])(\.{1,2}/[^\x27\x22]+)\1')

def tracked_files(root: Path) -> list[str]:
    proc = subprocess.run(['git','ls-files','-z'], cwd=root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if proc.returncode:
        raise RuntimeError('Cannot list git-tracked files. Run this from the actual MailForge Git checkout.')
    files = [p.decode('utf-8') for p in proc.stdout.split(b'\0') if p]
    if any(PurePosixPath(p).is_absolute() or '..' in PurePosixPath(p).parts for p in files):
        raise RuntimeError('Unsafe tracked file path')
    return sorted(files)

def package_manifests(root: Path) -> list[tuple[str,dict]]:
    result = []
    for parent in ('packages', 'apps'):
        folder = root / parent
        if not folder.is_dir():
            continue
        for pkg in sorted(folder.iterdir()):
            file = pkg / 'package.json'
            if not pkg.is_dir() or pkg.is_symlink() or not file.is_file() or file.is_symlink():
                continue
            try:
                result.append((pkg.relative_to(root).as_posix(), json.loads(file.read_text(encoding='utf-8'))))
            except (ValueError, OSError) as e:
                raise RuntimeError(f'Invalid manifest: {file}: {e}') from e
    return result

def local_dependency_graph(manifests: list[tuple[str,dict]]) -> dict:
    errors, blockers, warnings = [], [], []
    byname = {}
    for dirname, manifest in manifests:
        name = manifest.get('name')
        if not isinstance(name,str) or not name:
            errors.append(f'{dirname}: missing package name')
        elif name in byname:
            errors.append(f'duplicate package name: {name}')
        else:
            byname[name] = (dirname, manifest)
        if manifest.get('private') is True and dirname.startswith('packages/'):
            blockers.append(f'{name}: private=true; requires explicit publication decision')
    for dirname, manifest in manifests:
        for section in ('dependencies','peerDependencies','optionalDependencies','devDependencies'):
            deps = manifest.get(section) or {}
            for dep, version in deps.items():
                if not dep.startswith('@mailforge/'):
                    continue
                if dep not in byname:
                    errors.append(f'{dirname}: {section} refers to unknown workspace package {dep}')
                elif not str(version).startswith('workspace:'):
                    warnings.append(f'{dirname}: {section} uses non-workspace version for {dep}')
                elif section != 'devDependencies' and manifest.get('private') is not True and byname[dep][1].get('private') is True:
                    blockers.append(f'{manifest.get("name")}: public package requires private {dep}')
        if not dirname.startswith('packages/'):
            continue
        exports = manifest.get('exports')
        if isinstance(exports, dict) and isinstance(exports.get('.'), dict):
            for label, exported in exports['.'].items():
                if not isinstance(exported,str) or not exported.startswith('./dist/') or '..' in PurePosixPath(exported).parts:
                    errors.append(f'{dirname}: unsafe {label} export {exported!r}')
                elif (Path(dirname) / 'dist').is_dir():
                    # Export artifacts need a built checkout; existence is checked separately in main.
                    pass
    return {'errors': sorted(set(errors)), 'publicationBlockers': sorted(set(blockers)), 'warnings': sorted(set(warnings))}

def check_built_exports(root: Path, manifests: list[tuple[str,dict]]) -> list[str]:
    errors = []
    for dirname, manifest in manifests:
        if not dirname.startswith('packages/') or not (root / dirname / 'dist').is_dir():
            # A clean checkout may not be built yet. --verify builds first.
            continue
        entries = manifest.get('exports',{}).get('.',{}) if isinstance(manifest.get('exports'),dict) else {}
        if not isinstance(entries,dict):
            continue
        for label, exported in entries.items():
            if not isinstance(exported,str) or not exported.startswith('./dist/') or '..' in PurePosixPath(exported).parts:
                continue
            p = root / dirname / exported
            if not p.is_file():
                errors.append(f'{dirname}: missing built {label} export: {exported}')
    return errors

def references_and_duplicates(root: Path, tracked: list[str]) -> dict:
    digest_map, source_contents, diagnostics = defaultdict(list), {}, []
    for rel in tracked:
        p = root / rel
        if not p.is_file() or p.is_symlink() or SKIP_PARTS.intersection(PurePosixPath(rel).parts):
            continue
        if p.suffix not in SOURCE_SUFFIXES or p.stat().st_size > 2_000_000:
            continue
        raw = p.read_bytes()
        if len(raw) >= 100:
            digest_map[hashlib.sha256(raw).hexdigest()].append(rel)
        try:
            data = raw.decode('utf-8')
        except UnicodeDecodeError:
            continue
        source_contents[rel] = data
        for n, line in enumerate(data.splitlines(),1):
            if LINT_TERMS.search(line):
                diagnostics.append({'path':rel,'line':n,'text':line.strip()[:170]})
    duplicates = [g for g in digest_map.values() if len(g)>1]
    referenced = set()
    for rel, data in source_contents.items():
        for match in IMPORT_RE.finditer(data):
            spec = match.group(2).split('?')[0]
            basename = (PurePosixPath(rel).parent / spec).as_posix()
            candidates = [basename, *(basename + suffix for suffix in ('.ts','.tsx','.js','.jsx','.mjs','.cjs'))]
            if basename.endswith('.js'):
                candidates += [basename[:-3]+'.ts', basename[:-3]+'.tsx']
            if basename.endswith('.mjs'):
                candidates += [basename[:-4]+'.ts']
            candidates += [basename.rstrip('/')+'/index'+ext for ext in ('.ts','.tsx','.js','.mjs')]
            for item in candidates:
                cleaned = str(PurePosixPath(item))
                # posixpath.normpath handles parent imports without touching the disk.
                import posixpath
                referenced.add(posixpath.normpath(cleaned))
    orphans = []
    for rel in source_contents:
        p = PurePosixPath(rel)
        if not rel.startswith('packages/') or '/src/' not in rel:
            continue
        if p.name.startswith('index.') or p.name.endswith(('.test.ts','.spec.ts','.test.tsx','.spec.tsx')):
            continue
        if rel not in referenced:
            orphans.append(rel)
    return {'identicalSourceGroups':sorted([sorted(g) for g in duplicates]),
            'unreferencedSourceHeuristics':sorted(orphans),
            'sourceMarkers':diagnostics[:150],
            'sourceMarkerCount':len(diagnostics)}

def audit(root: Path, tracked: list[str] | None = None) -> dict:
    if not (root/'package.json').is_file() or not (root/'packages/template/package.json').is_file():
        raise RuntimeError('Expected MailForge root with packages/template (singular)')
    root_pkg = json.loads((root/'package.json').read_text(encoding='utf-8'))
    errors, warnings = [], []
    if root_pkg.get('packageManager') != 'pnpm@10.34.7':
        errors.append('Pinned package manager differs from pnpm@10.34.7')
    if (root/'packages/templates').exists():
        errors.append('Unexpected duplicate packages/templates directory')
    tracked = tracked_files(root) if tracked is None else sorted(tracked)
    if len(tracked) != len(set(tracked)):
        errors.append('Duplicate tracked paths detected')
    sensitive = [f for f in tracked if re.search(r'(^|/)\.env(?:\.|$)',f) and not f.endswith('.env.example')]
    if sensitive:
        errors += [f'Potentially sensitive tracked env file (inspect immediately): {p}' for p in sensitive]
    artifacts = [p for p in tracked if SKIP_PARTS.intersection(PurePosixPath(p).parts) and '.git' not in PurePosixPath(p).parts]
    if artifacts:
        warnings.append(f'{len(artifacts)} tracked build/generated files; review before untracking')
    manifests = package_manifests(root)
    pkg_report = local_dependency_graph(manifests)
    errors += check_built_exports(root, manifests)
    errors += pkg_report['errors']
    warnings += pkg_report['warnings']
    source = references_and_duplicates(root, tracked)
    ignored = (root/'.gitignore').read_text(encoding='utf-8') if (root/'.gitignore').is_file() else ''
    for line in ('node_modules/','dist/','coverage/','generated/'):
        if line not in ignored.splitlines():
            warnings.append(f'.gitignore missing expected rule {line}')
    if not (root/'.github/workflows/ci.yml').is_file():
        warnings.append('Stage 8.6 CI workflow not found in LOCAL checkout')
    if not (root/'docs/RELEASING.md').is_file():
        warnings.append('Stage 8.6 release guidance not found in LOCAL checkout')
    if not (root/'docs/README.md').is_file():
        warnings.append('Stage 8.6 docs index not found in LOCAL checkout')
    return {
        'schemaVersion':1,
        'generatedAt':datetime.now(timezone.utc).isoformat(),
        'gitTrackedFiles':len(tracked),
        'workspacePackages':[{'path':d,'name':m.get('name'),'private':m.get('private',False)} for d,m in manifests],
        'errors':sorted(set(errors)),
        'warnings':sorted(set(warnings)),
        'publicationBlockers':pkg_report['publicationBlockers'],
        'trackedGeneratedFiles':artifacts,
        **source,
        'deletionPolicy':'No files are deleted; duplicates and orphan results are REVIEW ONLY.',
    }

def as_markdown(report: dict) -> str:
    lines = ['# MailForge final repository audit','',
      '> Generated locally; this is a conservative audit, not permission to delete files or publish.', '',
      f'- Tracked files: **{report["gitTrackedFiles"]}**',
      f'- Workspace packages: **{len(report["workspacePackages"])}**',
      f'- Blocking source errors: **{len(report["errors"])}**',
      f'- Publish blockers: **{len(report["publicationBlockers"])}**',
      f'- Warnings: **{len(report["warnings"])}**',
      f'- Exact duplicate source groups: **{len(report["identicalSourceGroups"])}**',
      f'- Heuristic unreferenced sources (review only): **{len(report["unreferencedSourceHeuristics"])}**',
      '', '## Problems requiring action','']
    for label,key in [('Source errors','errors'),('Publication blockers','publicationBlockers'),('Warnings','warnings')]:
        lines += [f'### {label}','']
        lines += [f'- `{item.replace(chr(96), chr(39))}`' for item in report[key]] or ['- None']
        lines += ['']
    lines += ['## Tracked build/generated files (review before changing git tracking)','']
    lines += [f'- `{item}`' for item in report['trackedGeneratedFiles']] or ['- None']
    lines += ['', '## Byte-identical source files (review only)','']
    lines += [f'- '+ '  |  '.join('`'+f+'`' for f in g) for g in report['identicalSourceGroups']] or ['- None']
    lines += ['', '## Possible orphan sources (heuristic; do not auto-delete)','',
        'Imports through registries, package exports, dynamic strings, code generation and build tooling',
        'cannot be proven from this static pass. These entries require manual reference checks.','']
    lines += [f'- `{item}`' for item in report['unreferencedSourceHeuristics']] or ['- None']
    lines += ['', '## TODO/FIXME/NotImplemented markers','']
    lines += [f'- `{x["path"]}:{x["line"]}` — {x["text"]}' for x in report['sourceMarkers']] or ['- None']
    lines += ['', '## Release decision','',
      'Do not modify `private` or publish packages until the package-by-package release policy,',
      'dependency closure, verified local tarballs and real-client email testing are approved.',
      'A green static audit does not prove visual email-client compatibility.','']
    return '\n'.join(lines)

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--strict',action='store_true',help='Return nonzero for source errors (not private-package blockers)')
    parser.add_argument('--json',action='store_true',help='Print report JSON instead of summary')
    args = parser.parse_args()
    root = Path.cwd().resolve()
    report = audit(root)
    folder = root/'generated/release'
    folder.mkdir(parents=True,exist_ok=True)
    (folder/'final-cleanup-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    (folder/'final-cleanup-report.md').write_text(as_markdown(report),encoding='utf-8')
    if args.json:
        print(json.dumps(report,indent=2))
    else:
        print(f'MailForge cleanup audit: {report["gitTrackedFiles"]} tracked files; '+
              f'{len(report["errors"])} errors; {len(report["publicationBlockers"])} publication blockers; '+
              f'{len(report["warnings"])} warnings; {len(report["identicalSourceGroups"])} exact duplicate groups')
        print('Reports: generated/release/final-cleanup-report.md and .json')
        print(f'REVIEW ONLY: {len(report["unreferencedSourceHeuristics"])} heuristic orphan sources. No deletion performed.')
        for e in report['errors']:
            print('ERROR:',e,file=sys.stderr)
    return 1 if args.strict and report['errors'] else 0

if __name__ == '__main__':
    try: sys.exit(main())
    except (OSError,ValueError,RuntimeError) as e:
        print('ERROR:',e,file=sys.stderr)
        sys.exit(1)
