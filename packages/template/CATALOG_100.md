# MailForge — 100 professional templates (Tasks 8.5.16–8.5.17)

The unified `@mailforge/templates` built-in catalog now includes the original 49 IDs plus 51 purpose-specific templates in `src/catalog/ExpandedCatalogTemplates.ts`.

- The original ten core templates and three specialized templates remain unchanged.
- The previous 36 category templates retain their IDs, order, and strict data contracts.
- The new 51 share the existing validated category-specific data (account, authentication, billing, ecommerce, marketing, notifications, events, saas, support), plus a **new optional** `presentation` object for additional context.
- All 51 have distinct authored summaries and two-purpose-specific highlight messages, semantic themed nodes, their own subject, preheader, and CTA.
- Marketing templates still require `unsubscribeUrl` during rendering.
- URLs must use HTTP(S) without embedded credentials; all text is bounded and passed through the renderer's escaping pipeline.

## Example

```typescript
const result = await createEmail({theme: "ocean"}).render("event-ticket-issued", {
  data: {
    recipientName: "Priya",
    actionUrl: "https://example.com/tickets/123",
    event: {
      name: "Product Summit",
      venue: "Online",
      startsAt: "2026-11-05T10:00:00+05:30",
    },
    presentation: {
      facts: [{label: "Ticket", value: "TK-123"}],
      nextSteps: ["Open your ticket before the session"],
      secondaryAction: {label: "Event page", url: "https://example.com/events/123"},
    },
  },
  display: {heading: true},
});
```

`presentation` fields (for expansion IDs only): `summary`, `facts` (0–6 `{label,value}`), `nextSteps` (0–4), `secondaryAction` (both `label` and `url`). Existing category objects remain validated and optional. Never put passwords, API keys, verification codes, or payment card details in presentation fields.

All original customization, versioning, translation, template-selection and theme APIs remain intact. The 100 template IDs are separate from theme combinations, layouts or variants.

Run `corepack pnpm build`, focused Vitest tests, and the existing `node scripts/generate-all-template-previews.mjs` audit (now 100 × (number of themes + one optional no-heading variant) HTML/text pairs) before releasing. Inbox compatibility still requires real email-client testing.
