/**
 * Generate real MJML-compiled HTML/text previews for ALL packaged MailForge templates.
 * Usage (after pnpm install && pnpm build):
 *   node scripts/generate-all-template-previews.mjs
 * Output: generated/template-audit/index.html, report.json, and email files.
 * Fails with nonzero exit if ANY template/theme combination fails.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createEmail,
  listThemePresets,
} from "../packages/email/dist/index.js";

const outputDir = path.resolve("generated/template-audit");
const assetsDir = path.join(outputDir, "previews");
const url = (suffix) => `https://example.com/${suffix}`;
const catalogData = {
  recipientName: "Gopi", actionUrl: url("dashboard"),
  unsubscribeUrl: url("unsubscribe"), detail: "Reference: MF-2026-1024",
};
const invoiceData = {
  customer: { name: "Gopi" },
  invoice: { number: "INV-2026-001", issuedOn: "2026-10-13", dueOn: "2026-10-20", currency: "USD",
    items: [{ name: "Pro subscription", quantity: 1, unitPriceCents: 4900 }, { name: "Storage add-on", quantity: 1, unitPriceCents: 1000 }],
    shippingCents: 0, discountCents: 0 },
  paymentUrl: url("billing/invoices/INV-2026-001"),
};
const receiptData = {
  customer: { name: "Gopi" },
  receipt: { number: "RCPT-2026-001", transactionId: "TXN-829102", paidOn: "2026-10-13", currency: "USD",
    items: [{ name: "Pro subscription", quantity: 1, unitPriceCents: 4900 }] },
  receiptUrl: url("billing/receipts/RCPT-2026-001"),
};
const orderData = {
  customer: { firstName: "Gopi" },
  order: { id: "ORDER-2301", placedOn: "2026-10-13", currency: "USD",
    items: [{ name: "Notebook", quantity: 2, unitPriceCents: 2000 }, { name: "Pen", quantity: 1, unitPriceCents: 500 }],
    shippingCents: 500, discountCents: 0 },
  orderUrl: url("orders/ORDER-2301"),
};
const byId = {
  welcome: { user: { firstName: "Gopi" }, actionUrl: url("dashboard") },
  otp: { code: "004271", expiresInMinutes: 10 },
  login: { user: { firstName: "Gopi" }, loginUrl: url("login-token"), expiresInMinutes: 10 },
  "password-reset": { user: { firstName: "Gopi" }, resetUrl: url("password-reset"), expiresInMinutes: 15 },
  invitation: { invitee: { firstName: "Gopi" }, inviterName: "Rahul", organizationName: "Acme", inviteUrl: url("invite/accept") },
  notification: { title: "Your report is ready", message: "Your October report is now available in your workspace.", actionUrl: url("reports") },
  invoice: invoiceData,
  "payment-receipt": receiptData,
  "order-confirmation": orderData,
  "security-alert": { user: { firstName: "Gopi" }, alert: { kind: "new-device", occurredAt: "2026-10-13T09:30:00Z",
    device: "Chrome on Ubuntu", location: "Kolkata", severity: "warning" }, reviewUrl: url("security") },
  newsletter: { issue: "October 2026", title: "The Acme Newsletter", summary: "Insights and product updates from our team.",
    featured: { title: "A better workspace", description: "Meet the improvements we made this month.", articleUrl: url("blog/better-workspace"), author: "Acme Team" },
    stories: [{ title: "Release highlights", description: "Updates across the platform", articleUrl: url("blog/releases") }],
    unsubscribeUrl: url("unsubscribe") },
  promotion: { title: "A special offer for you", description: "Save on your next order with this exclusive code.",
    discountCode: "WELCOME20", discountPercent: 20, expiresOn: "2026-11-13",
    actionUrl: url("offers"), unsubscribeUrl: url("unsubscribe"), terms: "One use per customer." },
  "shipping-update": { customer: { firstName: "Gopi" }, order: { id: "ORDER-2301" },
    shipment: { carrier: "BlueExpress", trackingNumber: "TRK-2026101301", trackingUrl: url("tracking/TRK-2026101301"),
      status: "shipped", estimatedDelivery: "2026-10-19", destinationCity: "Kolkata" } },
};
// Rich, valid fixtures for the three final catalog categories.
const categorySamples = {
  events: { event: { name: "Acme Summit", startsAt: "2026-11-05T10:00:00+05:30", endsAt: "2026-11-05T12:00:00+05:30", venue: "Online" } },
  saas: { saas: { workspaceName: "Acme Team", planName: "Pro", usagePercent: 82 } },
  support: { support: { ticketId: "TICKET-2026-103", status: "open", agentName: "Support Team" } },
};
const themes = listThemePresets();
const h = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

await mkdir(assetsDir, { recursive: true });
const entries = [];
const errors = [];
const catalogEngine = createEmail({ brand: { name: "Acme", supportEmail: "support@example.com" } });
const catalog = catalogEngine.listBuiltinCatalog();
if (catalog.length !== 49) {
  throw new Error(`Unexpected catalog size ${catalog.length} (expected 49); inspect new template additions before regenerating.`);
}

for (const template of catalog) {
  const data = Object.hasOwn(byId, template.id) ? byId[template.id] : { ...catalogData, ...(categorySamples[template.category] ?? {}) };
  for (const theme of themes) {
    const engine = createEmail({
      brand: { name: "Acme", primaryColor: theme === "corporate" ? "#173b70" : theme === "minimal" ? "#222222" : "#2563eb", supportEmail: "support@example.com" },
      theme: { preset: theme },
    });
    // An additional no-heading sample is generated for the first theme.
    for (const variant of theme === "modern" ? ["default", "no-heading"] : ["default"]) {
      const slug = `${template.id}--${theme}--${variant}`;
      try {
        const result = await engine.render(template.id, {
          data,
          ...(variant === "no-heading" ? { display: { heading: false, headerTitle: false, eyebrow: false } } : {}),
        });
        if (!result.html.includes("<html") || !result.text.trim()) throw new Error("Missing compiled HTML or plain text");
        await Promise.all([
          writeFile(path.join(assetsDir, `${slug}.html`), result.html),
          writeFile(path.join(assetsDir, `${slug}.txt`), result.text),
        ]);
        const row = {
          id: template.id, category: template.category, theme, variant,
          subject: result.subject, html: `previews/${slug}.html`, text: `previews/${slug}.txt`,
          htmlBytes: Buffer.byteLength(result.html), textBytes: Buffer.byteLength(result.text),
          hasBrand: result.html.includes("Acme"),
          hasUnsubscribe: /unsubscribe/i.test(result.html),
          warnings: result.warnings,
          status: "pass",
        };
        entries.push(row);
        process.stdout.write(`PASS ${slug}\n`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ id: template.id, theme, variant, message });
        process.stderr.write(`FAIL ${slug}: ${message}\n`);
      }
    }
  }
}
const categories = [...new Set(catalog.map(t => t.category))];
const links = entries.map(item => `<tr><td>${h(item.id)}</td><td>${h(item.theme)}</td><td>${h(item.variant)}</td><td>${h(item.subject)}</td><td><a href="${h(item.html)}">HTML</a> · <a href="${h(item.text)}">Text</a></td></tr>`).join("\n");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MailForge template render audit</title><style>body{background:#f3f5fa;color:#132036;font:15px/1.55 system-ui,sans-serif;margin:0;padding:36px 16px}main{margin:auto;max-width:1120px}h1{font-size:30px}section{background:white;padding:22px;border-radius:14px;box-shadow:0 2px 14px #14253e10;overflow:auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #e5e8ef;padding:10px}th{font-size:13px;color:#52627c}a{color:#214fd4}small{color:#52627c}</style></head><body><main><h1>MailForge — template render audit</h1><p>These files were generated using MailForge's real <code>createEmail().render()</code> pipeline, not handcrafted mockups.</p><p><b>${catalog.length} templates</b> · ${h(categories.join(", "))} · ${entries.length} successful render combinations · <b>${errors.length} failures</b></p><section><table><thead><tr><th>Template</th><th>Theme</th><th>Display</th><th>Subject</th><th>Preview</th></tr></thead><tbody>${links}</tbody></table></section><p><small>Browser previews are not proof of Outlook/Gmail/Apple Mail compatibility. Validate in real inboxes before release.</small></p></main></body></html>`;
await writeFile(path.join(outputDir, "index.html"), html);
await writeFile(path.join(outputDir, "report.json"), JSON.stringify({ generatedAt: new Date().toISOString(), catalogCount: catalog.length, successful: entries.length, failed: errors.length, entries, errors }, null, 2));
console.log(`\nGallery: ${path.join(outputDir, "index.html")}`);
console.log(`Finished ${entries.length}/${catalog.length * 4} previews; ${errors.length} failures`);
if (errors.length) process.exitCode = 1;
