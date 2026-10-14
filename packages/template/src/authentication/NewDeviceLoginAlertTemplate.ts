import { z } from "zod";
import { DocumentValidator, type EmailDocument, type EmailNode } from "@mailforge/core";
import { contentSection, styledText, type TemplateNodeStyles } from "../shared/TemplateNodes.js";

const copy = (max: number) => z.string().trim().min(1).max(max)
    .refine(value => !/[\p{Cc}\p{Cf}]/u.test(value), "Control characters are not allowed");
const httpsUrl = z.url().max(2048).refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
}, "A credential-free absolute HTTPS URL is required");
const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a six-digit hex color");
const font = z.enum(["Arial, Helvetica, sans-serif", "Verdana, Geneva, sans-serif", "Tahoma, Arial, sans-serif", "Georgia, Times New Roman, serif"]);
const designSchema = z.object({
    canvas: hex.optional(), masthead: hex.optional(), surface: hex.optional(), accent: hex.optional(),
    alertBackground: hex.optional(), alertText: hex.optional(), panel: hex.optional(), panelBorder: hex.optional(),
    text: hex.optional(), muted: hex.optional(), label: hex.optional(), footer: hex.optional(), buttonText: hex.optional(),
    fontFamily: font.optional(),
}).strict();

export const newDeviceLoginAlertSchema = z.object({
    brandName: copy(120), firstName: copy(120), eventId: copy(100), deviceName: copy(180), location: copy(180),
    signInTime: copy(180), ipAddress: copy(100), securityUrl: httpsUrl, supportUrl: httpsUrl, year: z.number().int().min(2000).max(2200),
    securityLabel: copy(80).default("ACCOUNT SECURITY"), alertLabel: copy(100).default("NEW SIGN-IN DETECTED"),
    headingFirst: copy(80).default("A new device"), headingSecond: copy(80).default("signed in."),
    greetingAfterName: copy(240).default("we noticed a sign-in to your account from a new device."),
    detailsLabel: copy(80).default("SIGN-IN DETAILS"), deviceLabel: copy(40).default("DEVICE"), locationLabel: copy(40).default("LOCATION"),
    whenLabel: copy(40).default("WHEN"), ipLabel: copy(40).default("IP ADDRESS"),
    securityNotice: copy(300).default("If this was you, no action is needed. If you don't recognize this sign-in, secure your account."),
    buttonLabel: copy(80).default("Secure my account  →"), locationNotice: copy(240).default("Location is approximate and may be affected by your network or VPN."),
    supportPrefix: copy(80).default("Need help?"), supportLabel: copy(80).default("Contact support"), design: designSchema.optional(),
}).strict();
export type NewDeviceLoginAlertData = z.input<typeof newDeviceLoginAlertSchema>;

export const newDeviceLoginAlertPreviewData: NewDeviceLoginAlertData = {
    brandName: "Northline", firstName: "Alex", eventId: "SL-2841", deviceName: "Chrome on Ubuntu", location: "Bengaluru, India",
    signInTime: "14 Oct 2026, 10:32 IST", ipAddress: "203.0.113.42", securityUrl: "https://example.com/account/security",
    supportUrl: "https://example.com/support", year: 2026,
};

const palette = { canvas: "#EDF0EF", masthead: "#17212A", surface: "#FFFFFF", accent: "#D8432F", alertBackground: "#FFF0EA",
    alertText: "#A62C1D", panel: "#F6F7F7", panelBorder: "#E65D44", text: "#17212A", muted: "#4F5C65", label: "#849097", footer: "#76828A", buttonText: "#FFFFFF" };

export function buildNewDeviceLoginAlertTemplate(input?: unknown): EmailDocument {
    const d = newDeviceLoginAlertSchema.parse(input ?? newDeviceLoginAlertPreviewData);
    const o = d.design;
    const c = { canvas: o?.canvas ?? palette.canvas, masthead: o?.masthead ?? palette.masthead, surface: o?.surface ?? palette.surface,
        accent: o?.accent ?? palette.accent, alertBackground: o?.alertBackground ?? palette.alertBackground, alertText: o?.alertText ?? palette.alertText,
        panel: o?.panel ?? palette.panel, panelBorder: o?.panelBorder ?? palette.panelBorder, text: o?.text ?? palette.text,
        muted: o?.muted ?? palette.muted, label: o?.label ?? palette.label, footer: o?.footer ?? palette.footer, buttonText: o?.buttonText ?? palette.buttonText };
    const family = o?.fontFamily ?? "Arial, Helvetica, sans-serif";
    const body: TemplateNodeStyles = { fontFamily: family, fontSize: 15, lineHeight: "25px", color: c.muted, padding: "0" };
    const label: TemplateNodeStyles = { fontFamily: family, fontSize: 11, lineHeight: "19px", fontWeight: "bold", letterSpacing: "0.4px", color: c.label, padding: "0" };
    const detail = (id: string, title: string, value: string, mono = false): EmailNode => ({ id, type: "rich-text", props: { segments: [
        { text: `${title}     `, strong: true, color: c.label }, { text: value, strong: true, color: c.text },
    ] }, styles: { fontFamily: mono ? "Courier New, Courier, monospace" : family, fontSize: mono ? 13 : 14, lineHeight: "20px", padding: "0 0 14px" } });
    const document: EmailDocument = { schemaVersion: "1.0", id: "new-device-login-alert", version: "1.0.0",
        subject: `New sign-in to your ${d.brandName} account`, preheader: `A new sign-in was detected on your ${d.brandName} account. Review the device and location details.`,
        head: { title: `New sign-in to your ${d.brandName} account`, bodyBackgroundColor: c.canvas }, metadata: { category: "authentication", catalog: "builtin", designFamily: "security" },
        body: [
            { id: "new-device-masthead", type: "section", attrs: { "data-mf-columns": "keep-mobile" }, styles: { padding: "22px 34px", backgroundColor: c.masthead }, children: [
                { id: "new-device-brand-col", type: "column", styles: { width: "60%", padding: "0" }, children: [{ id: "new-device-brand", type: "rich-text", props: { segments: [{ text: d.brandName, strong: true, color: "#FFFFFF" }, { text: "/", strong: true, color: "#FF8063" }] }, styles: { fontFamily: family, fontSize: 19, lineHeight: "25px", fontWeight: "bold", padding: "0" } }] },
                { id: "new-device-security-col", type: "column", styles: { width: "40%", padding: "0" }, children: [styledText("new-device-security-label", d.securityLabel, { ...label, color: "#C1D1D5", fontSize: 10, lineHeight: "25px", letterSpacing: "1.7px", textAlign: "right" })] },
            ] },
            contentSection("new-device-content", [
                styledText("new-device-alert", d.alertLabel, { ...label, color: c.alertText, backgroundColor: c.alertBackground, fontSize: 10, lineHeight: "16px", letterSpacing: "1.45px", padding: "7px 13px 7px 16px" }),
                styledText("new-device-heading-first", d.headingFirst, { fontFamily: family, fontSize: 42, lineHeight: "47px", fontWeight: "bold", letterSpacing: "-1.7px", color: c.text, padding: "16px 0 0" }),
                styledText("new-device-heading", d.headingSecond, { fontFamily: family, fontSize: 42, lineHeight: "47px", fontWeight: "bold", letterSpacing: "-1.7px", color: c.text, padding: "0 0 16px" }, "hero-title"),
                styledText("new-device-greeting", `Hi ${d.firstName}, ${d.greetingAfterName}`, { ...body, padding: "0 0 28px" }, "body"),
            ], "43px 48px 0", c.surface),
            { id: "new-device-details", type: "section", styles: { padding: "0 48px", backgroundColor: c.surface }, children: [{ id: "new-device-details-panel", type: "column", styles: { backgroundColor: c.panel, borderLeft: `3px solid ${c.panelBorder}`, padding: "25px 28px 10px" }, children: [
                styledText("new-device-details-title", `${d.detailsLabel}  /  ${d.eventId}`, { ...label, fontSize: 10, lineHeight: "15px", letterSpacing: "1.8px", padding: "0 0 20px" }),
                detail("new-device-device", d.deviceLabel, d.deviceName), detail("new-device-location", d.locationLabel, d.location), detail("new-device-when", d.whenLabel, d.signInTime), detail("new-device-ip", d.ipLabel, d.ipAddress, true),
            ] }] },
            contentSection("new-device-action-area", [
                styledText("new-device-security-notice", d.securityNotice, { ...body, color: "#44525A", fontSize: 14, lineHeight: "23px", padding: "26px 0 22px" }),
                { id: "new-device-action", type: "button", props: { href: d.securityUrl, text: d.buttonLabel }, attrs: { "data-mf-style": "primary-action" }, styles: { fontFamily: family, backgroundColor: c.accent, color: c.buttonText, fontSize: 14, fontWeight: "bold", lineHeight: "19px", innerPadding: "13px 21px", borderRadius: "0px", textAlign: "left", padding: "0" } },
            ], "0 48px 34px", c.surface),
            contentSection("new-device-footer", [
                { id: "new-device-divider", type: "divider", styles: { color: "#E5E8EA", padding: "0 0 24px" } },
                styledText("new-device-location-notice", d.locationNotice, { ...body, color: c.footer, fontSize: 12, lineHeight: "20px", padding: "0 0 10px" }),
                { id: "new-device-support", type: "link", props: { href: d.supportUrl, prefix: `${d.supportPrefix} `, text: d.supportLabel, suffix: `  ·  © ${d.year} ${d.brandName}` }, styles: { ...body, color: "#384B58", fontSize: 12, lineHeight: "20px", padding: "0" } },
            ], "0 48px 34px", c.surface),
            contentSection("new-device-signature", [{ id: "new-device-signature-height", type: "spacer", props: { height: "5px" }, styles: { padding: "0" } }], "0", c.masthead),
        ], header: { id: "new-device-empty-header", type: "container" }, footer: { id: "new-device-empty-footer", type: "container" }, copyright: { id: "new-device-empty-copyright", type: "container" },
    };
    new DocumentValidator().validateOrThrow(document);
    return document;
}
