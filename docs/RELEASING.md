# Release preparation and publication policy

MailForge uses pnpm `10.34.7`. The package manager version is pinned in the root `package.json`.

## Local release candidate verification

```bash
npx --yes pnpm@10.34.7 install --frozen-lockfile
npx --yes pnpm@10.34.7 -r --if-present build
npx --yes pnpm@10.34.7 -r --if-present typecheck
npx --yes pnpm@10.34.7 -r --if-present test
npx --yes pnpm@10.34.7 lint
node --test tests/quality/Stage86Release.test.mjs
node scripts/stage86-release.mjs --check-docs --audit
node scripts/generate-all-template-previews.mjs
node scripts/audit-release-previews.mjs
node scripts/complete-stage8519-visual-review.mjs
```

Reports: `generated/release/stage86-audit.json`, `generated/template-audit/release-quality-report.json`, and `generated/template-audit/stage8519-review/report.json`.

Use `node scripts/stage86-release.mjs --pack` for **local tarballs only**. This does not publish or change package flags. Inspect tarballs manually before release. `workspace:*` dependencies need validation in packed manifests. Audit package exports and declaration files in the resulting tarballs, including any consumer packages that depend on them.

## Publication blockers and release decisions

The initial Stage 8.6 source has multiple private packages (including `@mailforge/email`, `@mailforge/templates`, and `@mailforge/themes`). **Do not remove `private: true` automatically.** Make an explicit package-by-package publication decision, validate dependency order and external names, add independent package licenses and appropriate npm provenance settings, and only then consider actual publication. No script in this stage calls `npm publish` or `pnpm publish`.

## Versioning and CI

Follow SemVer and `CHANGELOG.md`; tag only after CI is green and a human reviews the package contents. Changes to template IDs, schema contracts, themes, public exports, and security behavior require compatibility tests. Don't treat browser previews as Gmail/Outlook/Apple Mail certification.

## Security checklist

- No API keys, credentials, tokens or personal data in artifacts, example previews or npm tarballs.
- Confirm HTML sanitization, URL policies, tenant isolation, plain-text output and accessibility checks.
- Do not disable validation or weaken preview gates just to make a release pass.
- Verify each release's license metadata, README, bundled declarations, and dependency licenses.
- Review actual email-client rendering before claiming support.
