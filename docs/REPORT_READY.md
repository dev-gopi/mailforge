# Report Ready — built-in reference template 03

ID: `report-ready` · Category: `notifications` · Version: `1.0.0`

New transactional report-completion email based on the supplied `03_report_ready` reference.
The implementation uses MailForge's MJML section, column, text, button and safe-link
primitives, not pasted template HTML. The named `report-ready` entry is discoverable in
`listBuiltinCatalog()` and renderable with `createEmail().render("report-ready", {data})`.

Required fields: `companyName`, `recipientName`, `reportName`, `reportPeriod`,
`reportUrl` (absolute HTTPS URL without credentials), and `year` (integer).
Optional text fields: `sectionLabel`, `statusLabel`, `heading`, `greetingPrefix`,
`message`, `reportNameLabel`, `reportPeriodLabel`, `buttonLabel`, `fallbackPrefix`,
`fallbackLabel`, `fallbackSuffix`, `automatedNote`.
Optional `design`: `accent`, `surface`, `text`, `muted`, `panel`, `panelBorder`
(six-digit hexadecimal colors), and `fontFamily` (one of four safe stacks).

Run `node examples/report-ready/render.mjs` after building, then open
`generated/report-ready/index.html`. Use the standard `themeName`, `theme`,
`display`, layout settings and `patches` options for additional customization.
The explicit `design` values take precedence over corresponding theme node styles.

A *time-limited or authenticated report URL must come from the application*.
No sensitive tokens should be logged, tracked or committed in example fixtures.
No marketing unsubscribe copy is added to this transactional notification.

Known visual limitations: MJML's mobile columns may stack the brand/category
header, and the current shared MJML shell contains the footer instead of placing
it outside the bordered white card. Exact pixel fidelity and real-client support
require reference screenshots / Gmail, Outlook, Apple Mail testing.
