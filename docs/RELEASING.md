# Release preparation and publication policy

MailForge uses the pnpm version pinned in the root `package.json`.

## Local release candidate verification

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
pnpm lint
node --test tests/quality/ConcurrentRendering.test.mjs
node scripts/generate-all-template-previews.mjs
```

Review `generated/template-audit/index.html` and `report.json`. The preview generator confirms that the rendering pipeline completes; it does not certify email-client compatibility.

## Publication blockers and release decisions

Several packages are private (including `@mailforge/email`, `@mailforge/templates`, and `@mailforge/themes`). **Do not remove `private: true` automatically.** Make an explicit package-by-package publication decision, validate dependency order and external names, add independent package licenses and appropriate npm provenance settings, and only then consider actual publication. No repository script calls `npm publish` or `pnpm publish`.

## Versioning and CI

Follow SemVer and `CHANGELOG.md`; tag only after CI is green and a human reviews the package contents. Changes to template IDs, schema contracts, themes, public exports, and security behavior require compatibility tests. Don't treat browser previews as Gmail/Outlook/Apple Mail certification.

## Security checklist

- No API keys, credentials, tokens or personal data in artifacts, example previews or npm tarballs.
- Confirm HTML sanitization, URL policies, tenant isolation, plain-text output and accessibility checks.
- Do not disable validation or weaken preview gates just to make a release pass.
- Verify each release's license metadata, README, bundled declarations, and dependency licenses.
- Review actual email-client rendering before claiming support.
