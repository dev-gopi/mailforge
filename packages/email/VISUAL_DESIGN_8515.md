# MailForge 8.5.15 — Professional shared visual design

MailForge now uses the ten validated theme presets throughout common typography, spacing, automatic branding, content panels, table surfaces, action buttons and copyright/footer presentation. Template documents and developer-provided node styles are not rewritten.

## Style precedence

1. Validated built-in theme tokens are defaults.
2. Semantic roles (for example `title`, `primary-action`, `panel-inner`) override generic defaults.
3. Explicit `node.styles` from the template or developer patch override both.
4. Named/organization themes and per-render overrides are resolved by the existing engine before applying styles.

## Supported semantic roles

Existing: `title`, `body`, `muted`, `eyebrow`, `primary-action`, `quiet-action`, `divider`, `panel-outer`, `panel-inner`, `status-icon`, `promotional-code`.

Additional: `hero-title`, `hero-subtitle`, `section-title`, `brand-title`, `brand-rule`, `footer-note`, `success-note`, `warning-note`, `danger-note`.

Use with the existing `withRole(node, role)` helper or attach `attrs: {"data-mf-style": "section-title"}` to an EmailNode. MJML sanitizes the content and only allows supported style properties. Color tokens use the existing strict theme resolver.

## Automatic header/footer

A missing header gets a centered brand title, accessible logo if configured, and a theme-colored divider. A missing footer uses theme-muted notes. Existing custom header/footer/copyright nodes are preserved. `layout.header.enabled=false`, `layout.footer.enabled=false`, and per-render `display` controls still work.

## Responsive and dark mode

The MJML output keeps table-based fallbacks. Optional mobile enhancements use CSS classes; clients that ignore media queries get the readable inline MJML design. Dark mode remains opt-in with `{ darkMode: "auto" }` and uses validated six-digit colors. This does **not** certify support in Outlook or any particular mailbox.

## Generate visual samples

```bash
corepack pnpm build
node scripts/generate-stage8515-design-previews.mjs
xdg-open generated/stage8515-previews/welcome-premium.html
```

Review the 40 outputs, including mobile widths, Gmail, Outlook and Apple Mail where accessible. Compare content visibility and styling overrides in the playground. Do not publish until the manual email-client matrix is complete.
