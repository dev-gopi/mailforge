# Built-in `password-reset-secure` (template 103)

An independent account-security layout based on the supplied Password Reset 05 reference. It does **not** replace the original `password-reset` core template. Use the template ID and data through `createEmail().render()`.

```ts
import { createEmail } from "@mailforge/email";
const rendered = await createEmail().render("password-reset-secure", {
  data: {
    brandName: "Northstar", brandMonogram: "N", firstName: "Alex",
    resetUrl: "https://your-app.example/reset/one-time-token",
    supportUrl: "https://your-app.example/support", expiryMinutes: 30, year: 2026,
    design: { accent: "#4F46E5", canvas: "#EEF1F7", panel: "#F4F5FF" },
  },
  themeName: "modern",
  theme: { appearance: { containerWidth: 560, cardRadius: 16 } },
});
console.log(rendered.subject, rendered.html, rendered.text);
```

Data contract: `brandName`, `firstName`, `resetUrl` (HTTPS), `supportUrl` (HTTPS), `expiryMinutes` (1–1440), `year` (2000–3000). Optional brand monogram, independent copy strings, and palette/font controls are in `passwordResetSecureSchema` exported by `@mailforge/templates` and `@mailforge/email`. Standard theme, layout, display and patch render options remain available.

The builder uses existing MailForge primitives: content sections, a highlighted panel, button, inline support link, and reusable `data-mf-placement="before-shell"` / `"after-shell"` wrappers. No custom HTML is injected and all text is escaped. `before-shell` allows safe structural placement before the main MJML wrapper; only top-level `section` or `row` nodes may use it.

After building, run `node examples/password-reset-secure/render.mjs`, then open `generated/password-reset-secure/index.html`. Full matrix: `node scripts/generate-all-template-previews.mjs` followed by `node scripts/audit-release-previews.mjs` (105 IDs × 11 variants = 1,155 previews).

**Security:** This is an email renderer, not a token issuer. Your application must generate cryptographically strong, single-use, short-lived reset tokens, validate expiry on the server, limit reset requests, and never include passwords. The preview URL is fictitious. Browser previews do not certify Gmail/Outlook/Apple Mail; use real-client testing before deploying.
