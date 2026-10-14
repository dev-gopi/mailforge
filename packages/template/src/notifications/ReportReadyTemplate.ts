import { z } from "zod";
import { DocumentValidator, type EmailDocument, type EmailNode } from "@mailforge/core";
import { withRole } from "../shared/TemplateNodes.js";

/** A standalone, fully data-driven report-availability notification. */
const text = (max: number) => z.string().trim().min(1).max(max)
    .refine(value => !/\p{Cc}/u.test(value), "Control characters are forbidden");
const httpsUrl = z.string().url().max(2048).refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
}, "A credential-free HTTPS report URL is required");
// Preserve intentional trailing spaces in copy preceding an inline link.
const spacedText = (max: number) => z.string().min(1).max(max)
    .refine(value => value.trim().length > 0 && !/\p{Cc}/u.test(value), "Invalid inline copy");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const designSchema = z.object({
    accent: hex.optional(),
    surface: hex.optional(),
    text: hex.optional(),
    muted: hex.optional(),
    panel: hex.optional(),
    panelBorder: hex.optional(),
    fontFamily: z.enum([
        "Verdana, Geneva, sans-serif", "Arial, Helvetica, sans-serif",
        "Tahoma, Arial, sans-serif", "Georgia, Times New Roman, serif",
    ]).optional(),
}).strict();
/** Optional copy and palette customization is constrained and safe by default. */
export const reportReadySchema = z.object({
    companyName: text(120),
    recipientName: text(120),
    reportName: text(200),
    reportPeriod: text(160),
    reportUrl: httpsUrl,
    year: z.number().int().min(2000).max(3000),
    sectionLabel: text(80).default("REPORTS"),
    statusLabel: text(80).default("REPORT AVAILABLE"),
    heading: text(160).default("Your report is ready"),
    greetingPrefix: text(30).default("Hi"),
    message: text(500).default("Your report has been generated and is ready to download."),
    reportNameLabel: text(80).default("REPORT NAME"),
    reportPeriodLabel: text(80).default("REPORT PERIOD"),
    buttonLabel: text(80).default("Download report →"),
    fallbackPrefix: spacedText(200).default("If the button doesn't work, "),
    fallbackLabel: text(100).default("open your report here"),
    fallbackSuffix: text(20).default("."),
    automatedNote: text(160).default("This is an automated report notification from"),
    design: designSchema.optional(),
}).strict();
export type ReportReadyData = z.input<typeof reportReadySchema>;

// A blueprint is needed for catalog discovery; production rendering always
// requires caller-supplied validated data via createEmail().render().
export const reportReadyPreviewData: ReportReadyData = {
    companyName: "Aperture", recipientName: "Alex",
    reportName: "Monthly Performance Report", reportPeriod: "1–30 September 2026",
    reportUrl: "https://example.com/reports/sample", year: 2026,
};
const typeFont = "Verdana, Geneva, sans-serif";
function leaf(id: string, textValue: string, role: "body" | "muted" | "eyebrow" | "title" | "footer-note", styles: EmailNode["styles"] = {}): EmailNode {
    return { ...withRole({ id, type: role === "title" ? "heading" : "text", props: { text: textValue } }, role),
        attrs: { "data-mf-style": role, "data-mf-font": "technical" }, styles };
}
function section(id: string, children: EmailNode[], padding: string, backgroundColor?: string): EmailNode {
    return { id, type: "section", styles: { padding, ...(backgroundColor ? { backgroundColor } : {}) },
        children: [{ id: `${id}-column`, type: "column", children }] };
}

/** Reuses MailForge's MJML-safe section/column/text/button primitives. */
export function buildReportReadyTemplate(input?: unknown): EmailDocument {
    const data = reportReadySchema.parse(input ?? reportReadyPreviewData);
    const c = data.design ?? {};
    const font = c.fontFamily ?? typeFont;
    const body: EmailNode[] = [
        withRole(section("report-ready-accent-strip", [{ id: "report-ready-strip-height", type: "spacer", props: { height: "5px" }, styles: { padding: "0" } }], "0", c.accent), "accent-strip"),
        { id: "report-ready-brand-row", type: "section", styles: { padding: "25px 40px 20px", ...(c.surface ? { backgroundColor: c.surface } : {}) }, children: [
            { id: "report-ready-brand-left", type: "column", styles: { width: "70%", padding: "0" }, children: [
                leaf("report-ready-company", data.companyName, "title", { fontFamily: font, fontSize: 17, lineHeight: "24px", padding: "0", ...(c.text ? { color: c.text } : {}) }),
            ] },
            { id: "report-ready-brand-right", type: "column", styles: { width: "30%", padding: "0" }, children: [
                leaf("report-ready-category", data.sectionLabel, "muted", { fontFamily: font, textAlign: "right", fontWeight: "bold", fontSize: 10, letterSpacing: "1.4px", lineHeight: "24px", padding: "0", ...(c.muted ? { color: c.muted } : {}) }),
            ] },
        ] },
        section("report-ready-divider", [{ id: "report-ready-divider-line", type: "divider", styles: { padding: "0", ...(c.panelBorder ? { color: c.panelBorder } : {}) } }], "0"),
        section("report-ready-opening", [
            leaf("report-ready-status", data.statusLabel, "eyebrow", { fontFamily: font, fontSize: 11, lineHeight: "18px", letterSpacing: "1.2px", padding: "0 0 10px", ...(c.accent ? { color: c.accent } : {}) }),
            leaf("report-ready-title", data.heading, "title", { fontFamily: font, fontSize: 29, lineHeight: "38px", padding: "0 0 18px", ...(c.text ? { color: c.text } : {}) }),
            leaf("report-ready-greeting", `${data.greetingPrefix} ${data.recipientName},`, "body", { fontFamily: font, fontSize: 14, lineHeight: "24px", padding: "0 0 8px", ...(c.text ? { color: c.text } : {}) }),
            leaf("report-ready-message", data.message, "body", { fontFamily: font, fontSize: 14, lineHeight: "24px", padding: "0 0 25px", ...(c.text ? { color: c.text } : {}) }),
        ], "38px 40px 0"),
        { id: "report-ready-summary", type: "section", styles: { padding: "0 40px", ...(c.surface ? { backgroundColor: c.surface } : {}) }, children: [{
            id: "report-ready-summary-column", type: "column", attrs: { "data-mf-style": "panel-inner" },
            styles: { padding: "20px 21px", ...(c.panel ? { backgroundColor: c.panel } : {}), ...(c.panelBorder ? { border: `1px solid ${c.panelBorder}` } : {}) },
            children: [
                leaf("report-ready-name-label", data.reportNameLabel, "eyebrow", { fontFamily: font, fontSize: 11, lineHeight: "18px", padding: "0 0 7px", letterSpacing: "0.8px", ...(c.muted ? { color: c.muted } : {}) }),
                leaf("report-ready-name", data.reportName, "title", { fontFamily: font, fontSize: 15, lineHeight: "23px", padding: "0 0 16px", ...(c.text ? { color: c.text } : {}) }),
                leaf("report-ready-period-label", data.reportPeriodLabel, "eyebrow", { fontFamily: font, fontSize: 11, lineHeight: "18px", padding: "0 0 6px", letterSpacing: "0.8px", ...(c.muted ? { color: c.muted } : {}) }),
                leaf("report-ready-period", data.reportPeriod, "body", { fontFamily: font, fontSize: 13, lineHeight: "21px", padding: "0", ...(c.text ? { color: c.text } : {}) }),
            ],
        }] },
        section("report-ready-action-row", [{ id: "report-ready-action", type: "button", props: { href: data.reportUrl, text: data.buttonLabel }, attrs: { "data-mf-style": "primary-action", "data-mf-font": "technical" }, styles: { fontFamily: font, textAlign: "left", fontSize: 13, lineHeight: "20px", innerPadding: "14px 24px", padding: "26px 0 20px", ...(c.accent ? { backgroundColor: c.accent } : {}) } }], "0 40px"),
        section("report-ready-fallback-row", [{ id: "report-ready-fallback", type: "link", props: { href: data.reportUrl, prefix: data.fallbackPrefix, text: data.fallbackLabel, suffix: data.fallbackSuffix }, styles: { fontFamily: font, fontSize: 11, lineHeight: "19px", padding: "0", ...(c.muted ? { color: c.muted } : {}) }, attrs: { "data-mf-style": "muted", "data-mf-font": "technical" } }], "0 40px 42px"),
        section("report-ready-footer", [
            leaf("report-ready-auto-note", `${data.automatedNote} ${data.companyName}.`, "footer-note", { fontFamily: font, fontSize: 11, lineHeight: "18px", textAlign: "center", padding: "0 0 5px", ...(c.muted ? { color: c.muted } : {}) }),
            leaf("report-ready-copyright", `© ${data.year} ${data.companyName}`, "footer-note", { fontFamily: font, fontSize: 11, lineHeight: "18px", textAlign: "center", padding: "0", ...(c.muted ? { color: c.muted } : {}) }),
        ], "22px 16px"),
    ];
    const document: EmailDocument = {
        schemaVersion: "1.0", id: "report-ready", version: "1.0.0",
        subject: `Your ${data.reportName} is ready`,
        preheader: `Your ${data.reportName} is ready to download.`,
        head: { title: data.heading },
        metadata: { category: "notifications", catalog: "builtin", designFamily: "minimal" },
        body,
        // These empty structural sections prevent duplicate automatic chrome.
        header: { id: "report-ready-layout-header", type: "container" },
        footer: { id: "report-ready-layout-footer", type: "container" },
        copyright: { id: "report-ready-layout-copyright", type: "container" },
    };
    new DocumentValidator().validateOrThrow(document);
    return document;
}
