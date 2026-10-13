# Final repository cleanup — evidence and safe removal policy

The local MailForge repository is the source of truth; the public GitHub `main` branch may lag your Ubuntu checkout.

## One-pass final validation

Run the installer in its repository root:

```bash
python3 ~/Downloads/mailforge_final_cleanup.py --check
python3 ~/Downloads/mailforge_final_cleanup.py --apply
python3 ~/Downloads/mailforge_final_cleanup.py --verify
```

Read `generated/release/final-cleanup-report.md` and `.json`.
They include tracked build outputs, source TODOs, exact byte-identical files, possible orphan files, and npm publication blockers.

## Deletion policy

- **Never delete source automatically.** Import-based dead-code inference is not definitive: templates, plugins, transport adapters, the CLI and tests may load files indirectly.
- Exact byte duplicates are only review candidates. A matching file may be a compatibility facade, public export, template contract or purposeful test fixture.
- Remove a source file only after searching every reference, public import/export, dynamic lookup, template ID, CLI route, test fixture and package manifest, then rebuilding and retesting.
- Do not delete empty directories, old migration-like files, or extension points purely because they look unused.
- Do not rewrite theme, template, plugin or renderer registries for cleanup.
- Git-tracked `dist/`, `coverage/`, `generated/`, `node_modules/`, or private `.env` files require explicit inspection before changing Git tracking. Removing a tracked build artifact from Git should not delete a necessary source file.

## Publication policy

Release approval is separate from cleanup approval. Leave `private: true` untouched until the intended publishable package set and dependent packages are agreed upon. Validate packed tarballs, versioning, licenses, exported declarations, runtime entrypoints, package dependency resolution and actual email-client rendering before publication.

Local audit scripts do **not** run `npm publish`, push Git commits, alter private flags, or assert Gmail/Outlook/Apple Mail compatibility.
