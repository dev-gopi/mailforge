# MailForge Stage 8.5 final compatibility plan

## Automated (run after `corepack pnpm build`)

```bash
node --test tests/quality/PackageReleaseChecks.test.mjs
node --test tests/quality/ConcurrentRendering.test.mjs
node scripts/check-package-compatibility.mjs
node scripts/benchmark-release-rendering.mjs
node scripts/audit-release-previews.mjs
```

The package checker validates built import entrypoints, declarations, ESM imports, and CLI binaries for each actual package. It prints that packages marked `private: true` cannot currently be published to npm. These warnings are expected until Stage 8.6 and should not be silenced by changing all `private` flags at once.

## Required runtime/platform matrix (separate CI environments)

| Runtime | Linux | Windows | macOS |
|---|---|---|---|
| Node 20.19+ | Pending | Pending | Pending |
| Node 22 LTS | Pending | Pending | Pending |
| Node 24 LTS | Pending | Pending | Pending |

A check on one Ubuntu machine does **not** certify the other environments. Record Node version, platform, run URL or logs and result for each cell.

## Caching recommendation

Do **not** cache final personalized HTML based solely on template ID/version. Its output also depends on customer data, locale, organization, theme, variant, plugin hooks, runtime patches and display settings. A wrong cache key could leak PII and authorization-sensitive content. Benchmark first and only pursue a compiler-level cache after reviewing its exact inputs and invalidation strategy, including bound memory and isolation tests. Stage 8.5 does not automatically enable or promise caching.

## Real inbox acceptance

Follow `tests/compatibility/EMAIL_CLIENT_RELEASE_CHECKLIST.md`: send representative content to Gmail, Outlook and Apple Mail, check mobile, dark mode, RTL, image blocking, unsubscribe and text parity. Log the actual client versions and screenshots. Static previews and a browser playground do not certify inbox compatibility.
