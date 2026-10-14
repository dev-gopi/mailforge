# Workspace Invitation — editorial built-in (#105)

Template ID: `workspace-invitation-editorial`, category: `saas`.

This independent default template reproduces the supplied plum/coral/ivory invitation design using existing MailForge structured nodes. It does not replace `invitation` or `workspace-invitation`.

## Usage

```ts
import { createEmail } from "@mailforge/email";

const { subject, html, text } = await createEmail().render("workspace-invitation-editorial", {
  data: {
    brandName: "kindred", workspaceName: "Fieldnotes", workspaceInitial: "F",
    recipientFirstName: "Jordan", inviterName: "Tessa Carter", roleName: "Member",
    expiryDays: 7, invitationUrl: "https://example.com/invitations/example",
    supportUrl: "https://example.com/support", year: 2026,
    companyAddress: "88 Grove Street, Portland, OR 97205",
    design: { plum: "#452A40", coral: "#D76750" },
  },
  theme: { appearance: { containerWidth: 600, cardRadius: 0 } },
  overrides: { byId: { "invite-editorial-action": { props: { text: "Join now" } } } },
});
```

All required fields are validated with a strict schema. Optional copy fields: `categoryLabel`, `kicker`, `headingFirst`, `headingSecond`, `heroSubtitle`, `greetingPrefix`, `invitationMessage`, `workspaceLabel`, `roleLabel`, `buttonLabel`, `expirationPrefix`, `ignoreNotice`, `supportPrefix`, `supportLabel`. Optional `design`: `canvas`, `surface`, `plum`, `coral`, `heroTitle`, `heroMuted`, `text`, `muted`, `border`, `workspacePanel`, `workspaceBorder`, `avatar`, `avatarText`, `workspaceTitle`, `footer`, `buttonText`, `serifFont`, `bodyFont`.

Use `theme`, `layout`, `display`, `overrides.byType`, `overrides.byRole`, `overrides.byId` and `patches` for additional customization. Relevant node IDs begin with `invite-editorial-`. Text cannot contain control characters and the invitation/support URLs must be credential-free HTTPS URLs. The layout uses the already-supported `before-shell`, `after-shell` and `keep-mobile` node semantics; there are no raw HTML nodes.

**Security:** Invitation tokens, expiry and single-use enforcement belong in the application server, not this email template. Use a trusted invitation domain and do not log the URL token. Fixture values must not be used for real invitations.

## Responsive display variants

The global `display: { heading: false, headerTitle: false, eyebrow: false }` variant
may hide the brand-row label. MailForge preserves the remaining brand column and
normalizes its responsive layout automatically; this does not change the default
two-column desktop/mobile brand row. Likewise, hiding an individual column via
`display.hideIds` lets the surviving column fill the row. The MJML renderer still
rejects invalid `keep-mobile` rows that were originally authored with fewer than
two columns.

## Preview and verification

```sh
npx --yes pnpm@10.34.7 -r --if-present build
npx --yes pnpm@10.34.7 -r --if-present typecheck
npx --yes pnpm@10.34.7 -r --if-present test
npx --yes pnpm@10.34.7 lint
node examples/workspace-invitation-editorial/render.mjs
node scripts/generate-all-template-previews.mjs
node scripts/audit-release-previews.mjs
```

The gallery targets **105 templates × 11 theme/variant combinations = 1,155 renders**. Compare the HTML with the two source screenshots in `examples/workspace-invitation-editorial/reference/`. Browser screenshots do not certify Gmail, Outlook or Apple Mail compatibility. Verify actual clients separately.
