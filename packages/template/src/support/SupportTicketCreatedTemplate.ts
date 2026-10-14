import { z } from "zod";
import { DocumentValidator, type EmailDocument, type EmailNode } from "@mailforge/core";
import { contentSection, singleColumnSection, styledText, type TemplateNodeStyles } from "../shared/TemplateNodes.js";

const copy = (max: number) => z.string().trim().min(1).max(max)
    .refine(value => !/[\p{Cc}\p{Cf}]/u.test(value), "Control characters are not allowed");
const emailAddress = z.string().trim().email().max(320);
const httpsUrl = z.url().max(2048).refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
}, "A credential-free absolute HTTPS URL is required");
const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a six-digit hex color");
const font = z.enum(["Arial, Helvetica, sans-serif", "Verdana, Geneva, sans-serif", "Tahoma, Arial, sans-serif", "Georgia, Times New Roman, serif"]);

const designSchema = z.object({
    canvas: hex.optional(),
    surface: hex.optional(),
    banner: hex.optional(),
    bannerAccent: hex.optional(),
    bannerTitle: hex.optional(),
    ticketNumber: hex.optional(),
    statusBg: hex.optional(),
    statusText: hex.optional(),
    text: hex.optional(),
    muted: hex.optional(),
    brand: hex.optional(),
    brandIcon: hex.optional(),
    categoryLabel: hex.optional(),
    kicker: hex.optional(),
    border: hex.optional(),
    rowBorder: hex.optional(),
    label: hex.optional(),
    value: hex.optional(),
    buttonBg: hex.optional(),
    buttonText: hex.optional(),
    questionBg: hex.optional(),
    questionBorder: hex.optional(),
    questionText: hex.optional(),
    questionLink: hex.optional(),
    footer: hex.optional(),
    fontFamily: font.optional(),
}).strict();

export const supportTicketCreatedSchema = z.object({
    brandName: copy(120),
    customerName: copy(120),
    ticketNumber: copy(80),
    ticketStatus: copy(40).default("OPEN"),
    ticketSubject: copy(200),
    createdAt: copy(120),
    ticketUrl: httpsUrl,
    supportEmail: emailAddress,
    year: z.number().int().min(2000).max(2200),
    categoryLabel: copy(80).default("SUPPORT DESK"),
    ticketLabel: copy(80).default("TICKET NUMBER"),
    kicker: copy(80).default("REQUEST RECEIVED"),
    headline: copy(160).default("Your ticket is in."),
    greetingIntro: copy(250).default("we’ve received your support request. We’ll email you when there’s an update."),
    subjectLabel: copy(80).default("Subject"),
    createdLabel: copy(80).default("Created"),
    buttonLabel: copy(80).default("View ticket\u00a0\u00a0→"),
    questionPrefix: copy(80).default("Questions? Contact"),
    footerNotice: copy(180).default("Automated support confirmation"),
    design: designSchema.optional(),
}).strict();
export type SupportTicketCreatedData = z.input<typeof supportTicketCreatedSchema>;

export const supportTicketCreatedPreviewData: SupportTicketCreatedData = {
    brandName: "Northline",
    customerName: "Alex",
    ticketNumber: "HD-20481",
    ticketStatus: "OPEN",
    ticketSubject: "Unable to access my workspace",
    createdAt: "14 October 2026 · 10:30 AM IST",
    ticketUrl: "https://example.com/support/tickets/HD-20481",
    supportEmail: "support@example.com",
    year: 2026,
};

const palette = {
    canvas: "#EEF5F7",
    surface: "#FFFFFF",
    banner: "#153C4C",
    bannerAccent: "#1FB8AD",
    bannerTitle: "#9CE5DB",
    ticketNumber: "#FFFFFF",
    statusBg: "#D8F8EF",
    statusText: "#13645D",
    text: "#173344",
    muted: "#4C6570",
    brand: "#173344",
    brandIcon: "#008C97",
    categoryLabel: "#59727D",
    kicker: "#007E82",
    border: "#DBE9EC",
    rowBorder: "#E2EBEF",
    label: "#738994",
    value: "#213D4C",
    buttonBg: "#087F87",
    buttonText: "#FFFFFF",
    questionBg: "#E9F6F6",
    questionBorder: "#AACFD0",
    questionText: "#4B7076",
    questionLink: "#086F79",
    footer: "#8298A1",
};

export function buildSupportTicketCreatedTemplate(input?: unknown): EmailDocument {
    const d = supportTicketCreatedSchema.parse(input ?? supportTicketCreatedPreviewData);
    const o = d.design;
    const c = {
        canvas: o?.canvas ?? palette.canvas,
        surface: o?.surface ?? palette.surface,
        banner: o?.banner ?? palette.banner,
        bannerAccent: o?.bannerAccent ?? palette.bannerAccent,
        bannerTitle: o?.bannerTitle ?? palette.bannerTitle,
        ticketNumber: o?.ticketNumber ?? palette.ticketNumber,
        statusBg: o?.statusBg ?? palette.statusBg,
        statusText: o?.statusText ?? palette.statusText,
        text: o?.text ?? palette.text,
        muted: o?.muted ?? palette.muted,
        brand: o?.brand ?? palette.brand,
        brandIcon: o?.brandIcon ?? palette.brandIcon,
        categoryLabel: o?.categoryLabel ?? palette.categoryLabel,
        kicker: o?.kicker ?? palette.kicker,
        border: o?.border ?? palette.border,
        rowBorder: o?.rowBorder ?? palette.rowBorder,
        label: o?.label ?? palette.label,
        value: o?.value ?? palette.value,
        buttonBg: o?.buttonBg ?? palette.buttonBg,
        buttonText: o?.buttonText ?? palette.buttonText,
        questionBg: o?.questionBg ?? palette.questionBg,
        questionBorder: o?.questionBorder ?? palette.questionBorder,
        questionText: o?.questionText ?? palette.questionText,
        questionLink: o?.questionLink ?? palette.questionLink,
        footer: o?.footer ?? palette.footer,
    };
    const family = o?.fontFamily ?? "Arial, Helvetica, sans-serif";
    const body: TemplateNodeStyles = { fontFamily: family, fontSize: 14, lineHeight: "23px", color: c.muted, padding: "0" };

    const document: EmailDocument = {
        schemaVersion: "1.0",
        id: "support-ticket-created",
        version: "1.0.0",
        subject: `Support request received — ${d.brandName}`,
        preheader: `Ticket ${d.ticketNumber} is ${d.ticketStatus.toLowerCase()}. We’ll email you when there’s an update.`,
        head: { title: `Support request received`, bodyBackgroundColor: c.canvas },
        metadata: { category: "support", catalog: "builtin", designFamily: "conversation" },
        body: [
            // Brand header row
            { id: "support-ticket-header", type: "section", attrs: { "data-mf-columns": "keep-mobile" }, styles: { padding: "0 3px 19px" }, children: [
                { id: "support-ticket-brand-col", type: "column", styles: { width: "65%", padding: "0" }, children: [
                    { id: "support-ticket-brand", type: "rich-text", props: { segments: [
                        { text: "▦", strong: true, color: c.brandIcon },
                        { text: `\u00a0 ${d.brandName}`, strong: true, color: c.brand },
                    ] }, styles: { fontFamily: family, fontSize: 20, lineHeight: "27px", fontWeight: "800", letterSpacing: "-0.8px", padding: "0" } },
                ] },
                { id: "support-ticket-category-col", type: "column", styles: { width: "35%", padding: "0" }, children: [
                    styledText("support-ticket-category", d.categoryLabel, { fontFamily: family, fontSize: 10, lineHeight: "16px", fontWeight: "bold", letterSpacing: "1.6px", color: c.categoryLabel, textAlign: "right", padding: "0" }),
                ] },
            ] },

            // Top case file banner (Navy background with left teal border on first column)
            { id: "support-ticket-banner", type: "section", attrs: { "data-mf-columns": "keep-mobile" }, styles: { padding: "27px 31px 28px", backgroundColor: c.banner }, children: [
                { id: "support-ticket-banner-left", type: "column", styles: { width: "74%", padding: "0", borderLeft: `6px solid ${c.bannerAccent}` }, children: [
                    styledText("support-ticket-number-label", d.ticketLabel, { fontFamily: family, fontSize: 10, lineHeight: "15px", fontWeight: "bold", letterSpacing: "1.9px", color: c.bannerTitle, padding: "0 0 10px 14px" }),
                    styledText("support-ticket-number-value", d.ticketNumber, { fontFamily: "Courier New, Courier, monospace", fontSize: 32, lineHeight: "37px", fontWeight: "bold", letterSpacing: "-1.4px", color: c.ticketNumber, padding: "0 0 0 14px" }),
                ] },
                { id: "support-ticket-banner-right", type: "column", styles: { width: "26%", padding: "0" }, children: [
                    styledText("support-ticket-status-pill", d.ticketStatus, { fontFamily: family, fontSize: 10, lineHeight: "14px", fontWeight: "bold", letterSpacing: "0.6px", color: c.statusText, backgroundColor: c.statusBg, padding: "7px 10px", textAlign: "right" }),
                ] },
            ] },

            // Main body section
            contentSection("support-ticket-content", [
                styledText("support-ticket-kicker", d.kicker, { fontFamily: family, fontSize: 10, lineHeight: "16px", fontWeight: "bold", letterSpacing: "1.6px", color: c.kicker, padding: "0 0 11px" }, "eyebrow"),
                styledText("support-ticket-headline", d.headline, { fontFamily: family, fontSize: 36, lineHeight: "42px", fontWeight: "bold", letterSpacing: "-1.3px", color: c.text, padding: "0 0 16px" }, "hero-title"),
                styledText("support-ticket-greeting", `Hi ${d.customerName}, ${d.greetingIntro}`, { ...body, padding: "0 0 27px" }, "body"),
            ], "36px 39px 0", c.surface),

            // Subject row divider
            singleColumnSection("support-ticket-row-subject-top", [
                { id: "support-ticket-row-div-1", type: "divider", styles: { color: c.rowBorder, padding: "0" } },
            ], { padding: "0 39px", backgroundColor: c.surface }),

            // Subject row
            { id: "support-ticket-row-subject", type: "section", attrs: { "data-mf-columns": "keep-mobile" }, styles: { padding: "15px 39px 14px", backgroundColor: c.surface }, children: [
                { id: "support-ticket-subject-label-col", type: "column", styles: { width: "28%", padding: "0" }, children: [
                    styledText("support-ticket-subject-label", d.subjectLabel, { fontFamily: family, fontSize: 12, lineHeight: "19px", fontWeight: "bold", color: c.label, padding: "0" }),
                ] },
                { id: "support-ticket-subject-value-col", type: "column", styles: { width: "72%", padding: "0" }, children: [
                    styledText("support-ticket-subject-value", d.ticketSubject, { fontFamily: family, fontSize: 13, lineHeight: "19px", fontWeight: "bold", color: c.value, textAlign: "right", padding: "0" }),
                ] },
            ] },

            // Created row divider
            singleColumnSection("support-ticket-row-created-top", [
                { id: "support-ticket-row-div-2", type: "divider", styles: { color: c.rowBorder, padding: "0" } },
            ], { padding: "0 39px", backgroundColor: c.surface }),

            // Created row
            { id: "support-ticket-row-created", type: "section", attrs: { "data-mf-columns": "keep-mobile" }, styles: { padding: "14px 39px 15px", backgroundColor: c.surface }, children: [
                { id: "support-ticket-created-label-col", type: "column", styles: { width: "28%", padding: "0" }, children: [
                    styledText("support-ticket-created-label", d.createdLabel, { fontFamily: family, fontSize: 12, lineHeight: "19px", fontWeight: "bold", color: c.label, padding: "0" }),
                ] },
                { id: "support-ticket-created-value-col", type: "column", styles: { width: "72%", padding: "0" }, children: [
                    styledText("support-ticket-created-value", d.createdAt, { fontFamily: family, fontSize: 13, lineHeight: "19px", fontWeight: "bold", color: c.value, textAlign: "right", padding: "0" }),
                ] },
            ] },

            // Bottom divider of metadata table
            singleColumnSection("support-ticket-row-created-bottom", [
                { id: "support-ticket-row-div-3", type: "divider", styles: { color: c.rowBorder, padding: "0" } },
            ], { padding: "0 39px", backgroundColor: c.surface }),

            // Action button area
            contentSection("support-ticket-action-area", [
                { id: "support-ticket-action", type: "button", props: { href: d.ticketUrl, text: d.buttonLabel }, attrs: { "data-mf-style": "primary-action" }, styles: { fontFamily: family, backgroundColor: c.buttonBg, color: c.buttonText, fontSize: 14, fontWeight: "bold", lineHeight: "20px", innerPadding: "14px 27px", borderRadius: "0px", textAlign: "left", padding: "0" } },
            ], "28px 39px 35px", c.surface),

            // Questions strip
            { id: "support-ticket-questions", type: "section", styles: { padding: "17px 39px", backgroundColor: c.questionBg }, children: [
                { id: "support-ticket-questions-col", type: "column", styles: { width: "100%", padding: "0" }, children: [
                    { id: "support-ticket-question-link", type: "link", props: { href: `mailto:${d.supportEmail}`, prefix: `${d.questionPrefix} `, text: d.supportEmail, suffix: "." }, styles: { fontFamily: family, fontSize: 12, lineHeight: "19px", color: c.questionLink, padding: "0", fontWeight: "bold" } },
                ] },
            ] },

            // Footer note
            singleColumnSection("support-ticket-footer", [
                styledText("support-ticket-footer-text", `© ${d.year} ${d.brandName} · ${d.footerNotice}`, { fontFamily: family, fontSize: 11, lineHeight: "19px", color: c.footer, padding: "0" }),
            ], { padding: "22px 3px 0" }),
        ],
        header: { id: "support-ticket-empty-header", type: "container" },
        footer: { id: "support-ticket-empty-footer", type: "container" },
        copyright: { id: "support-ticket-empty-copyright", type: "container" },
    };

    new DocumentValidator().validateOrThrow(document);
    return document;
}
