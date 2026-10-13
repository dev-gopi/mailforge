# MailForge compatibility plan

## Automated checks

Run after `corepack pnpm build`:

```bash
node --test tests/quality/ConcurrentRendering.test.mjs
node scripts/generate-all-template-previews.mjs
```

Inspect built import entrypoints, declarations, ESM imports, and CLI binaries for each package before release. Packages marked `private: true` cannot be published to npm; do not silence that by changing all `private` flags at once.

## Required runtime/platform matrix

| Runtime | Linux | Windows | macOS |
|---|---|---|---|
| Node 20.19+ | Pending | Pending | Pending |
| Node 22 LTS | Pending | Pending | Pending |
| Node 24 LTS | Pending | Pending | Pending |

A check on one Ubuntu machine does **not** certify the other environments. Record Node version, platform, run URL or logs and result for each cell.

## Caching recommendation

Do **not** cache final personalized HTML based solely on template ID/version. Its output also depends on customer data, locale, organization, theme, variant, plugin hooks, runtime patches and display settings. A wrong cache key could leak PII and authorization-sensitive content. Benchmark first and only pursue a compiler-level cache after reviewing its exact inputs and invalidation strategy, including bound memory and isolation tests.

## Real inbox acceptance

Follow `tests/compatibility/EMAIL_CLIENT_RELEASE_CHECKLIST.md`: send representative content to Gmail, Outlook and Apple Mail, check mobile, dark mode, RTL, image blocking, unsubscribe and text parity. Log the actual client versions and screenshots. Static previews and a browser playground do not certify inbox compatibility.
