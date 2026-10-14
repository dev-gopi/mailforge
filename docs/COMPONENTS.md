# Reusable component reference

> Generated from the registered component-name constants in `@mailforge/components`.

## Core document primitive: inline link

The `link` node safely renders `props: { text, href, prefix?, suffix? }` as an
escaped text line with one validated HTTP(S) anchor. No raw HTML is needed.
The `styles` map accepts the same `mj-text` styling options as a regular text node.

## Core document primitive: rich text and layout chrome

The `rich-text` node accepts `{ segments: [{text, strong?, color?}] }`.
Each segment is HTML-escaped, with optional bold emphasis or a validated
six-digit hexadecimal color. There is no arbitrary HTML passthrough.
Use a `column` with `data-mf-style="quote-panel"` to obtain a theme-based
comment/quote panel with a left accent border, background, and padding.
Use `data-mf-columns="keep-mobile"` on a section with two or more columns
to preserve their horizontal layout on narrow screens.
Use `data-mf-placement="after-shell"` on a top-level section/row to render a
footer or secondary message outside the central card, but within the email body.
Existing templates are unchanged unless they explicitly opt in.

## Standard

- `mf-action-button`
- `mf-brand-logo`
- `mf-image-caption`
- `mf-otp-code`
- `mf-security-notice`
- `mf-status-badge`

## Composite

- `mf-button-group`
- `mf-content-card`
- `mf-order-item`
- `mf-order-summary`
- `mf-price-summary`
- `mf-two-column`

## Extended

- `mf-callout-box`
- `mf-divider-with-text`
- `mf-key-value-list`
- `mf-social-links`

## Professional

- `mf-company-signature`
- `mf-hero-section`
- `mf-progress-timeline`
- `mf-statistic-block`

## Business

- `mf-alert-banner`
- `mf-avatar`
- `mf-coupon-code`
- `mf-data-table`
- `mf-discount-banner`
- `mf-event-card`
- `mf-feature-grid`
- `mf-invoice-table`
- `mf-metric-grid`
- `mf-pricing-comparison`
- `mf-product-card`
- `mf-product-grid`
- `mf-profile-card`
- `mf-ticket-card`
- `mf-transaction-summary`
- `mf-verification-panel`

## Marketing

- `mf-brand-header`
- `mf-full-width-button`
- `mf-legal-footer`
- `mf-status-card`

Marketing components are registered automatically by `createEmail()`. They can
also be imported from `@mailforge/email` or `@mailforge/components` and
registered on a custom component catalog.

Use `createEmail().registerComponent()` to add project-specific reusable components.
Business components only render values provided and validated by the application.
