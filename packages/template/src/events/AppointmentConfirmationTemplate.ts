import { z } from "zod";
import { DocumentValidator, type EmailDocument, type EmailNode } from "@mailforge/core";

/** Calendar-ticket appointment confirmation. Appointment facts must be supplied by the caller. */
const copy = (max: number) => z.string().trim().min(1).max(max)
    .refine(value => !/[\p{Cc}\p{Cf}]/u.test(value), "Control characters are not allowed");
const httpsUrl = z.url().max(2048).refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
}, "A credential-free absolute HTTPS URL is required");
const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a six-digit hex color");
const font = z.enum(["Arial, Helvetica, sans-serif", "Verdana, Geneva, sans-serif",
    "Tahoma, Arial, sans-serif", "Georgia, Times New Roman, serif", "Trebuchet MS, Arial, sans-serif"]);
const designSchema = z.object({
    canvas: hex.optional(), surface: hex.optional(), accent: hex.optional(), dark: hex.optional(),
    text: hex.optional(), muted: hex.optional(), panel: hex.optional(), panelLabel: hex.optional(),
    dateAccent: hex.optional(), dateMuted: hex.optional(), detailsText: hex.optional(), buttonText: hex.optional(), border: hex.optional(), footer: hex.optional(),
    headingFont: font.optional(), bodyFont: font.optional(),
}).strict();

export const appointmentConfirmationSchema = z.object({
    brandName: copy(120), firstName: copy(120), appointmentName: copy(180),
    fullDate: copy(120), monthShort: z.string().trim().regex(/^[A-Z]{3}$/, "Use a three-letter uppercase month"),
    dayNumber: z.string().trim().regex(/^(?:[1-9]|[12][0-9]|3[01])$/, "Use a calendar day from 1 to 31"),
    weekdayShort: z.string().trim().regex(/^[A-Z]{3}$/, "Use a three-letter uppercase weekday"),
    year: z.number().int().min(2000).max(2200), timeRange: copy(100), timezone: copy(80),
    appointmentLocation: copy(220), appointmentUrl: httpsUrl, manageUrl: httpsUrl, supportUrl: httpsUrl,
    companyAddress: copy(350),
    statusLabel: copy(80).default("CONFIRMED"), kicker: copy(100).default("YOUR APPOINTMENT IS SET"),
    heading: copy(120).default("You're booked"), introAfterName: copy(260).default("your appointment is confirmed. Here are the details."),
    appointmentLabel: copy(80).default("APPOINTMENT"), buttonLabel: copy(80).default("View appointment  →"),
    managePrefix: copy(100).default("Need to make a change?"), manageLabel: copy(80).default("Manage booking"),
    supportPrefix: copy(80).default("Questions?"), supportLabel: copy(80).default("Contact support"),
    design: designSchema.optional(),
}).strict();
export type AppointmentConfirmationData = z.input<typeof appointmentConfirmationSchema>;

/** Illustrative fixture only; derive actual appointment status, dates and time zone server-side. */
export const appointmentConfirmationPreviewData: AppointmentConfirmationData = {
    brandName: "northstar", firstName: "Alex", appointmentName: "Design consultation", fullDate: "October 21, 2026",
    monthShort: "OCT", dayNumber: "21", weekdayShort: "WED", year: 2026,
    timeRange: "10:30–11:00 AM", timezone: "IST", appointmentLocation: "Video call · Hosted by Maya",
    appointmentUrl: "https://example.com/appointments/preview", manageUrl: "https://example.com/bookings/preview",
    supportUrl: "https://example.com/support", companyAddress: "18 Park Avenue, Kolkata, India",
};

const palette = { canvas: "#EDF2EF", surface: "#FFFEFA", accent: "#EE784E", dark: "#173C3F",
    text: "#183B3D", muted: "#536867", panel: "#E7F0EB", panelLabel: "#47746B",
    dateAccent: "#A9E5C7", dateMuted: "#D4E8E4", detailsText: "#274C4E", buttonText: "#FFFFFF", border: "#DCE7E2", footer: "#7B908C" };
type Styles = NonNullable<EmailNode["styles"]>;
const leaf = (id: string, value: string, styles: Styles, role?: string): EmailNode => ({ id, type: "text", props: { text: value }, styles, ...(role ? { attrs: { "data-mf-style": role } } : {}) });
const section = (id: string, children: EmailNode[], padding: string, backgroundColor: string): EmailNode => ({
    id, type: "section", styles: { padding, backgroundColor }, children: [{ id: `${id}-column`, type: "column", children }],
});

export function buildAppointmentConfirmationTemplate(input?: unknown): EmailDocument {
    const d = appointmentConfirmationSchema.parse(input ?? appointmentConfirmationPreviewData);
    const o = d.design;
    const c = { canvas: o?.canvas ?? palette.canvas, surface: o?.surface ?? palette.surface, accent: o?.accent ?? palette.accent,
        dark: o?.dark ?? palette.dark, text: o?.text ?? palette.text, muted: o?.muted ?? palette.muted,
        panel: o?.panel ?? palette.panel, panelLabel: o?.panelLabel ?? palette.panelLabel, dateAccent: o?.dateAccent ?? palette.dateAccent,
        dateMuted: o?.dateMuted ?? palette.dateMuted, detailsText: o?.detailsText ?? palette.detailsText,
        buttonText: o?.buttonText ?? palette.buttonText, border: o?.border ?? palette.border, footer: o?.footer ?? palette.footer };
    const headingFont = o?.headingFont ?? "Trebuchet MS, Arial, sans-serif";
    const bodyFont = o?.bodyFont ?? "Arial, Helvetica, sans-serif";
    const body: Styles = { fontFamily: bodyFont, fontSize: 15, lineHeight: "24px", color: c.muted, padding: "0" };
    const label: Styles = { fontFamily: bodyFont, fontSize: 10, lineHeight: "16px", fontWeight: "bold", letterSpacing: "2px", color: c.panelLabel, padding: "0" };
    const document: EmailDocument = {
        schemaVersion: "1.0", id: "appointment-confirmation", version: "1.0.0",
        subject: `Appointment confirmed — ${d.brandName}`, preheader: `Your ${d.appointmentName} appointment on ${d.fullDate} is confirmed.`,
        head: { title: `Appointment confirmed — ${d.brandName}` }, metadata: { category: "events", catalog: "builtin", designFamily: "ticket" },
        body: [
            section("appointment-accent-strip", [{ id: "appointment-accent-height", type: "spacer", props: { height: "7px" }, styles: { padding: "0" } }], "0", c.accent),
            { id: "appointment-header", attrs: { "data-mf-columns": "keep-mobile" }, styles: { padding: "29px 43px 23px", backgroundColor: c.surface }, type: "section", children: [
                { id: "appointment-brand-column", type: "column", styles: { width: "60%", padding: "0" }, children: [{ id: "appointment-brand", type: "rich-text", props: { segments: [{ text: d.brandName, strong: true, color: c.dark }, { text: ".", strong: true, color: c.accent }] }, styles: { fontFamily: headingFont, fontSize: 21, lineHeight: "26px", fontWeight: "bold", letterSpacing: "-0.7px", padding: "0" } }] },
                { id: "appointment-status-column", type: "column", styles: { width: "40%", padding: "0" }, children: [{ id: "appointment-status", type: "rich-text", props: { segments: [{ text: "✓  ", strong: true, color: c.panelLabel }, { text: d.statusLabel, strong: true, color: c.panelLabel }] }, styles: { ...label, textAlign: "right", lineHeight: "26px", letterSpacing: "1.2px" } }] },
            ] },
            section("appointment-content", [
                leaf("appointment-kicker", d.kicker, { ...label, color: c.accent, letterSpacing: "2.1px", padding: "0 0 12px" }, "eyebrow"),
                { id: "appointment-heading", type: "rich-text", props: { segments: [{ text: d.heading, strong: true, color: c.dark }, { text: ".", strong: true, color: c.accent }] }, attrs: { "data-mf-style": "hero-title" }, styles: { fontFamily: headingFont, fontSize: 43, lineHeight: "48px", fontWeight: "bold", letterSpacing: "-1.8px", padding: "0 0 14px" } },
                leaf("appointment-intro", `Hi ${d.firstName}, ${d.introAfterName}`, { ...body, padding: "0 0 30px" }, "body"),
            ], "36px 43px 0", c.surface),
            { id: "appointment-ticket", type: "section", styles: { padding: "0 43px", backgroundColor: c.surface }, children: [
                { id: "appointment-date-column", type: "column", styles: { width: "31%", backgroundColor: c.dark, padding: "27px 12px" }, children: [
                    leaf("appointment-date-month", `${d.monthShort} ${d.year}`, { ...label, color: c.dateAccent, textAlign: "center", fontSize: 12, lineHeight: "18px" }),
                    leaf("appointment-date-day", d.dayNumber, { fontFamily: headingFont, fontSize: 70, lineHeight: "76px", fontWeight: "bold", letterSpacing: "-3px", color: c.surface, textAlign: "center", padding: "0" }),
                    leaf("appointment-date-weekday", d.weekdayShort, { ...label, color: c.dateMuted, textAlign: "center", fontSize: 12, lineHeight: "18px", letterSpacing: "1.7px" }),
                ] },
                { id: "appointment-details-column", type: "column", styles: { width: "69%", backgroundColor: c.panel, padding: "24px 23px 23px" }, children: [
                    leaf("appointment-details-label", d.appointmentLabel, { ...label, padding: "0 0 8px", letterSpacing: "1.6px" }),
                    leaf("appointment-name", d.appointmentName, { fontFamily: headingFont, fontSize: 21, lineHeight: "26px", fontWeight: "bold", letterSpacing: "-0.5px", color: c.text, padding: "0 0 13px" }),
                    leaf("appointment-time", `${d.timeRange} ${d.timezone}`, { ...body, color: c.detailsText, fontSize: 14, lineHeight: "22px", fontWeight: "bold" }),
                    leaf("appointment-location", d.appointmentLocation, { ...body, color: c.muted, fontSize: 13, lineHeight: "22px" }),
                ] },
            ] },
            section("appointment-actions", [
                { id: "appointment-action", type: "button", props: { text: d.buttonLabel, href: d.appointmentUrl }, attrs: { "data-mf-style": "primary-action" }, styles: { fontFamily: bodyFont, fontSize: 14, lineHeight: "20px", fontWeight: "bold", backgroundColor: c.accent, color: c.buttonText, innerPadding: "13px 25px", borderRadius: "0px", padding: "0", textAlign: "left" } },
                { id: "appointment-manage", type: "link", props: { href: d.manageUrl, prefix: `${d.managePrefix} `, text: d.manageLabel }, styles: { ...body, color: c.muted, fontSize: 13, lineHeight: "22px", padding: "19px 0 0" } },
            ], "29px 43px 39px", c.surface),
            section("appointment-footer-rule", [{ id: "appointment-divider", type: "divider", styles: { color: c.border, padding: "0" } }], "0", c.surface),
            section("appointment-footer", [
                { id: "appointment-support", type: "link", props: { href: d.supportUrl, prefix: `${d.supportPrefix} `, text: d.supportLabel }, styles: { ...body, fontSize: 12, lineHeight: "20px", color: "#245E54", padding: "0" } },
                leaf("appointment-address", `© ${d.year} ${d.brandName}. ${d.companyAddress}`, { ...body, fontSize: 12, lineHeight: "20px", color: c.footer }),
            ], "22px 43px 26px", c.surface),
        ], header: { id: "appointment-empty-header", type: "container" }, footer: { id: "appointment-empty-footer", type: "container" }, copyright: { id: "appointment-empty-copyright", type: "container" },
    };
    new DocumentValidator().validateOrThrow(document);
    return document;
}
