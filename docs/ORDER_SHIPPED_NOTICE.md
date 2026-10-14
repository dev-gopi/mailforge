# Built-in `order-shipped-notice` (#104)

Sky Route is a 600px email-safe ecommerce order-shipped notification adapted from reference 08.
It is separate from the existing `shipping-update` and `order-delivered` templates. No reference
HTML is embedded: MailForge builds ordinary email document sections, columns, rich-text, buttons,
links, dividers and reusable milestone nodes.

## Public API

```ts
import { createEmail } from "@mailforge/email";

const output = await createEmail().render("order-shipped-notice", {
  data: {
    brandName: "northline", firstName: "Maya", orderNumber: "NL-20481",
    deliveryDate: "Oct 17 – 19", carrierName: "ParcelPost", trackingNumber: "PK9048193",
    trackingUrl: "https://example.com/track/PK9048193",
    supportUrl: "https://example.com/support",
    companyAddress: "123 Market St, San Francisco, CA 94103",
    progressSteps: ["Confirmed", "Packed", "Shipped", "Delivered"], currentStep: 3,
    design: { accent: "#3159D6", panel: "#EDF3FF" },
  },
  themeName: "modern",
  // Universal layout and node overrides remain available.
});
console.log(output.html, output.text);
```

## Data contract

Required: `brandName`, `firstName`, `orderNumber`, `deliveryDate`, `carrierName`,
`trackingNumber`, `trackingUrl`, `supportUrl`, `companyAddress`. Links must be absolute,
credential-free HTTPS URLs; copy is bounded, nonempty and control-character-free. The schema is
strict and rejects unexpected fields.

Optional copy: `categoryLabel`, `statusLabel`, `heading`, `introAfterName`,
`estimatedDeliveryLabel`, `buttonLabel`, `orderLabel`, `carrierLabel`, `supportPrompt`,
`supportLabel`, `footerNote`.

Optional state: `progressSteps` (2–6 caller-controlled labels, defaults to the reference's four
stages), `currentStep` (0 through the number of stages; 1-based current stage). Never infer a
stage from the delivery estimate or tracking number; the application supplies actual shipment
events. The fixture values and default current step are illustrative, not live tracking facts.

Optional `design`: `accent`, `accentLight`, `canvas`, `surface`, `text`, `muted`,
`brand`, `border`, `panel`, `panelText`, `success`, `progressPending`,
`progressLabel`, `footer`, `fontFamily`. Supported fonts are Arial, Verdana, Tahoma, Georgia.
Colors are strictly 6-digit hex. Unspecified colors use safe defaults even with a partial design.

The standard `createEmail().render()` options `theme`, `themeName`, `layout`, `layoutPreset`,
`display`, `overrides` and `patches` remain available. Node IDs start with `order-shipped-`.

## Verification

```bash
npx --yes pnpm@10.34.7 -r --if-present build
npx --yes pnpm@10.34.7 -r --if-present typecheck
npx --yes pnpm@10.34.7 -r --if-present test
npx --yes pnpm@10.34.7 lint
node examples/order-shipped/render.mjs
node scripts/generate-all-template-previews.mjs
node scripts/audit-release-previews.mjs
```

Expected complete matrix: 105 template IDs × 11 samples = 1,155 renders. Browser preview is
not Gmail, Outlook or Apple Mail certification. Compare generated
`generated/order-shipped/index.html` against the supplied reference at desktop and mobile widths.
