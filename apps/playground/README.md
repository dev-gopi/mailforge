# MailForge Studio — local visual playground

Uses the **real** `@mailforge/email` rendering pipeline. Does not send email or connect to external email providers.

## Ubuntu quick start

Run from the MailForge project root:

```bash
corepack pnpm install --no-frozen-lockfile
corepack pnpm build
corepack pnpm --filter @mailforge/playground dev
```

Open `http://127.0.0.1:4173` in Chrome. Keep the terminal open while using the playground. Stop with `Ctrl+C`.

## Features

- Search and filter the complete built-in catalog.
- Load the **same real sample data** as `scripts/generate-all-template-previews.mjs`.
- Edit JSON data, branding, theme, layout, default visual variant, locale, subject, preheader and visibility controls.
- Live preview in a sandboxed iframe, desktop/mobile width selection, HTML and plain-text inspection and download.
- Validates inputs on the server and calls `createEmail().render()` for every preview. JavaScript is not executed inside preview iframe.
- Uses only Node.js built-ins for the server; no React/Vite dependency is required.

## Verification

```bash
corepack pnpm --filter @mailforge/playground test
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm lint
```

The app intentionally binds **only** to `127.0.0.1` and is intended for local development, not public deployment. No user accounts or authentication are implemented. Don't expose it via reverse proxy.

Template versions are displayed from catalog metadata; rendering an unpublished historical version is **not** offered. The playground's built-in variants are the existing `default`, `compact`, `premium`, `branded` IDs; plugins/custom tenant themes are not loaded automatically.

Visual browser rendering cannot certify Gmail, Outlook or Apple Mail compatibility. Use the existing generated audit and real-client testing for release QA.
