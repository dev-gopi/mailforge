# Universal template customization

All built-in MailForge templates (including the catalog and specialized designs)
and developer-registered templates share the **same** `createEmail().render()`
pipeline. No custom HTML or modified template source is required.

## What users can override

| Requirement | Public option |
| --- | --- |
| Dynamic content, recipients and approved template fields | `data` (template-specific validation) |
| Subject, preheader and visibility | `display` |
| Theme presets and general colors, typography, spacing and container | `themeName` / `theme` |
| Header, footer, logo, copyright and layout | `layout`, `layoutPreset` |
| All matching components of a given type | `overrides.byType` |
| Components with a shared semantic `data-mf-style` | `overrides.byRole` |
| Individual text, URL, image, styling and attributes | `overrides.byId` |
| Insert, replace, remove or rearrange components | `patches` (`DocumentPatch`) |
| Reusable tenant-specific variations | Existing `variant` and `organizationId` APIs |

`overrides` works on every built-in template, including `report-ready`,
`activity-notification`, `password-reset-secure`, and the original catalog.
It is optional: existing render calls remain unchanged.

## Example

```ts
import { createEmail } from "@mailforge/email";

const email = createEmail({ brand: { name: "Northstar" } });
const result = await email.render("password-reset-secure", {
  data: {
    brandName: "Northstar", firstName: "Alex",
    resetUrl: "https://example.com/reset", supportUrl: "https://example.com/support",
    expiryMinutes: 30, year: 2026,
  },
  themeName: "modern",
  theme: {
    colors: { primary: "#3f51b5", background: "#eef2ff" },
    typography: { fontFamily: "Arial, Helvetica, sans-serif" },
    appearance: { containerWidth: 560 },
  },
  display: { subject: "Set a new password", preheader: "Secure password reset" },
  overrides: {
    byType: { text: { styles: { fontFamily: "Georgia, serif" } } },
    byRole: { "primary-action": { styles: { backgroundColor: "#c02666" } } },
    byId: {
      "password-secure-heading": { props: { text: "Choose a new password" },
        styles: { color: "#123456", fontSize: 28 } },
      "password-secure-action": { props: { text: "Reset now", href: "https://example.com/reset" } },
    },
  },
});
console.log(result.html, result.text);
```

## Order, safety, and compatibility

- `byType` applies first, then `byRole`, then `byId` (most specific wins).
- When combined with `patches`, the existing structural patches apply first;
  `overrides` are applied **after component expansion** and before theme
  application. Explicit component styles take priority over theme defaults.
- Overrides are limited to `props`, `styles`, and `attrs`. For structural
  changes, use the existing `patches` API, not raw HTML.
- Unknown `byId` selectors throw `EmailDocumentOverrideError`. Missing types
  or roles do not throw, so shared presets can target different templates.
- Override input and template documents are cloned per render, avoiding
  accidental changes to later messages or other organizations.
- The normal component, document, resource-budget, URL and MJML safety
  validations still apply. Content contracts continue to reject invalid data.
- The `theme` system supplies general defaults, but a template's explicit
  color or font can take precedence. Use `overrides` for a specific component
  and `data.design` where a particular template exposes named design tokens.
- Use `email.getTemplate(id)` to inspect the document's stable node IDs and
  `data-mf-style` roles. Individual required input fields still need to be
  supplied according to the selected built-in template's data schema.
- Do not accept arbitrary `overrides` from untrusted third parties without
  authorization and server-side filtering: they can legitimately change
  links, branding, and content.

For a full runnable example from source, run:

```bash
npx --yes pnpm@10.34.7 -r --if-present build
node examples/customization/render.mjs
```

This writes `generated/customization/password-reset-secure.html` and a text
preview. Real email-client verification remains separate.

### Customize the order shipped notice

The standard `overrides` render option applies to every node of `order-shipped-notice`; for example,
`overrides.byId["order-shipped-heading"]` modifies its rich-text segments and styles, while
`overrides.byType.text.styles.fontFamily` updates all text. Use `data` for shipment-specific content,
`data.design` for the reusable Sky Route palette, and `theme` / `layout` for shared presentation.
See [ORDER_SHIPPED_NOTICE.md](ORDER_SHIPPED_NOTICE.md).
