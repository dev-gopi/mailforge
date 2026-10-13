# MailForge email-client release checklist

This is a **manual** QA checklist. Static HTML inspection or a browser preview is not evidence of inbox compatibility.

For each of the representative email categories (welcome/OTP, invoice/order, marketing with unsubscribe, notification, RTL translation):

- [ ] Send a real message to Gmail on desktop web and Android, confirm subject, preheader, images, spacing and CTA.
- [ ] Send a real message to Outlook for Windows (classic and new Outlook when available) and Outlook Web; inspect typography, table widths, CTA alignment and borders.
- [ ] Send a real message to Apple Mail on macOS/iOS, check scaling and layout.
- [ ] Check mobile widths around 320px, 375px and 430px and desktop around 600px.
- [ ] Test light mode and dark mode, especially text contrast, backgrounds and brand assets.
- [ ] Test images blocked, including meaningful `alt` text, and an all-text path.
- [ ] Check keyboard focus, semantic reading order, descriptive links and screen reader announcement where possible.
- [ ] Verify marketing consent / unsubscribe links against the application's legal and operational requirements.
- [ ] Verify plain-text content and text/HTML consistency for security-critical details.
- [ ] Verify that custom trusted CSS and plugins are only enabled for application-owned content.
- [ ] Collect client/version screenshots and record defects with template ID, theme, layout and OS.

## Automated local checks

From the repository root after `pnpm build`:

```bash
node --test tests/quality/PreviewQuality.test.mjs
node scripts/generate-all-template-previews.mjs
node scripts/audit-release-previews.mjs
node scripts/benchmark-release-rendering.mjs
```

Outputs: `generated/template-audit/report.json`, `release-quality-report.json`, and `render-benchmark.json`.

Passes of these scripts **do not certify** Gmail, Outlook, Apple Mail, WCAG conformance or safe email deliverability.
