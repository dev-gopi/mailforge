import { z } from "zod";
import { DocumentValidator, type EmailDocument, type EmailNode } from "@mailforge/core";

/** An independent indigo password-reset design. Never generates or retains reset tokens. */
const words = (max: number) => z.string().trim().min(1).max(max)
    .refine(value => !/\p{Cc}/u.test(value), "Control characters are not allowed");
const httpsUrl = z.string().url().max(2048).refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
}, "A credential-free HTTPS URL is required");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const designSchema = z.object({
    accent: hex.optional(), canvas: hex.optional(), surface: hex.optional(),
    text: hex.optional(), muted: hex.optional(), panel: hex.optional(),
    panelText: hex.optional(), border: hex.optional(),
    fontFamily: z.enum(["Arial, Helvetica, sans-serif", "Verdana, Geneva, sans-serif",
        "Tahoma, Arial, sans-serif", "Georgia, Times New Roman, serif"]).optional(),
}).strict();

export const passwordResetSecureSchema = z.object({
    brandName: words(120), brandMonogram: words(3).optional(),
    firstName: words(120), resetUrl: httpsUrl, supportUrl: httpsUrl,
    expiryMinutes: z.number().int().min(1).max(1440),
    year: z.number().int().min(2000).max(3000),
    kicker: words(80).default("ACCOUNT SECURITY"),
    heading: words(150).default("Reset your password"),
    greetingPrefix: words(40).default("Hi"),
    message: words(500).default("We received a request to reset your password. Select the button below to set a new one."),
    buttonLabel: words(80).default("Reset password →"),
    expiryPrefix: words(80).default("Link expires in"),
    ignoreNotice: words(280).default("If you didn’t request this, you can safely ignore this email."),
    supportPrefix: words(80).default("Need help?"),
    supportLabel: words(80).default("Contact support"),
    copyrightSuffix: words(100).default("All rights reserved."),
    design: designSchema.optional(),
}).strict();
export type PasswordResetSecureData = z.input<typeof passwordResetSecureSchema>;

/** Examples only; production must pass an application-issued, short-lived single-use URL. */
export const passwordResetSecurePreviewData: PasswordResetSecureData = {
    brandName: "Northstar", brandMonogram: "N", firstName: "Alex",
    resetUrl: "https://example.com/reset/example-only", supportUrl: "https://example.com/support",
    expiryMinutes: 30, year: 2026,
};

const defaults = {
    accent: "#4F46E5", canvas: "#EEF1F7", surface: "#FFFFFF",
    text: "#172039", muted: "#4A556B", panel: "#F4F5FF",
    panelText: "#41466D", border: "#DEE3EF",
};
type Styles = NonNullable<EmailNode["styles"]>;
const leaf = (id: string, value: string, styles: Styles,
    attrs?: Record<string, string>): EmailNode => ({
    id, type: "text", props: { text: value }, styles, ...(attrs ? { attrs } : {}),
});
const section = (id: string, children: EmailNode[], padding: string, bg: string,
    attrs?: Record<string, string>): EmailNode => ({
    id, type: "section", ...(attrs ? { attrs } : {}), styles: { padding, backgroundColor: bg },
    children: [{ id: `${id}-col`, type: "column", children }],
});

/** Standard safe EmailDocument; uses registered nodes and existing MJML renderer. */
export function buildPasswordResetSecureTemplate(input?: unknown): EmailDocument {
    const d = passwordResetSecureSchema.parse(input ?? passwordResetSecurePreviewData);
    // Keep palette values concrete when an optional design override is absent.
    // Spreading optional fields would otherwise allow `undefined` into styles.
    const design = d.design;
    const c = {
        accent: design?.accent ?? defaults.accent,
        canvas: design?.canvas ?? defaults.canvas,
        surface: design?.surface ?? defaults.surface,
        text: design?.text ?? defaults.text,
        muted: design?.muted ?? defaults.muted,
        panel: design?.panel ?? defaults.panel,
        panelText: design?.panelText ?? defaults.panelText,
        border: design?.border ?? defaults.border,
    };
    const font = design?.fontFamily ?? "Arial, Helvetica, sans-serif";
    const base: Styles = { fontFamily: font, fontSize: 15, lineHeight: "25px", color: c.muted, padding: "0" };
    const body: EmailNode[] = [
        // Reusable before-shell section is rendered outside the white card.
        { id: "password-secure-brand", type: "section", attrs: {
            "data-mf-placement": "before-shell", "data-mf-columns": "keep-mobile",
        }, styles: { padding: "30px 3px 22px", backgroundColor: c.canvas }, children: [
            { id: "password-secure-brand-mark-col", type: "column", styles: {
                width: "34px", padding: "0", backgroundColor: c.accent, borderRadius: "10px",
            }, children: [
                leaf("password-secure-brand-mark", d.brandMonogram ?? Array.from(d.brandName)[0]!.toUpperCase(), {
                    ...base, color: "#FFFFFF", fontWeight: "bold", fontSize: 19,
                    lineHeight: "34px", textAlign: "center", padding: "0",
                }),
            ] },
            { id: "password-secure-brand-name-col", type: "column", styles: { width: "88%", padding: "0" }, children: [
                leaf("password-secure-brand-name", d.brandName, {
                    ...base, color: c.text, fontWeight: "bold", fontSize: 15, lineHeight: "34px", padding: "0 0 0 8px",
                }),
            ] },
        ] },
        section("password-secure-top-rule", [
            leaf("password-secure-rule", "·", { padding: "0", backgroundColor: c.accent, color: c.accent, fontSize: 1, lineHeight: "5px" }),
        ], "0", c.accent),
        section("password-secure-intro", [
            leaf("password-secure-kicker", d.kicker, {
                ...base, color: c.accent, fontSize: 11, lineHeight: "16px", fontWeight: "bold",
                letterSpacing: "1.7px", padding: "0 0 15px",
            }, { "data-mf-style": "eyebrow" }),
            { id: "password-secure-heading", type: "heading", props: { text: d.heading, level: 1 },
                attrs: { "data-mf-style": "title" }, styles: { ...base, fontSize: 32, lineHeight: "39px", fontWeight: "bold", color: c.text,
                    padding: "0 0 22px" } },
            leaf("password-secure-greeting", `${d.greetingPrefix} ${d.firstName},`, {
                ...base, padding: "0 0 14px",
            }),
            leaf("password-secure-description", d.message, { ...base, padding: "0 0 28px" }),
            { id: "password-secure-action", type: "button", props: { href: d.resetUrl, text: d.buttonLabel },
                attrs: { "data-mf-style": "primary-action" },
                styles: { fontFamily: font, backgroundColor: c.accent, color: "#FFFFFF",
                    fontSize: 15, fontWeight: "bold", borderRadius: "9px", textAlign: "left",
                    lineHeight: "19px", innerPadding: "15px 26px", padding: "0" } },
        ], "34px 42px 29px", c.surface),
        { id: "password-secure-expiry-row", type: "section", styles: {
            padding: "0 42px 38px", backgroundColor: c.surface }, children: [
            { id: "password-secure-expiry-panel", type: "column", styles: {
                backgroundColor: c.panel, borderRadius: "9px", padding: "14px 17px",
                ...(d.design?.border ? { border: `1px solid ${c.border}` } : {}) }, children: [
                { id: "password-secure-expiry-label", type: "rich-text", props: { segments: [
                    { text: `${d.expiryPrefix} ${d.expiryMinutes} ${d.expiryMinutes === 1 ? "minute" : "minutes"}.`, strong: true },
                ] }, styles: { ...base, fontSize: 13, lineHeight: "20px", color: c.panelText } },
                leaf("password-secure-expiry-note", d.ignoreNotice, { ...base,
                    fontSize: 13, lineHeight: "20px", color: c.panelText }),
            ] },
        ] },
        section("password-secure-outside-footer", [
            { id: "password-secure-support", type: "link", props: {
                href: d.supportUrl, prefix: `${d.supportPrefix} `, text: d.supportLabel,
            }, styles: { ...base, fontSize: 12, lineHeight: "19px", color: c.accent, textAlign: "center" } },
            leaf("password-secure-copyright", `© ${d.year} ${d.brandName}. ${d.copyrightSuffix}`, {
                ...base, fontSize: 12, lineHeight: "19px", textAlign: "center", color: "#7A8497",
            }),
        ], "23px 20px 8px", c.canvas, { "data-mf-placement": "after-shell" }),
    ];
    const document: EmailDocument = {
        schemaVersion: "1.0", id: "password-reset-secure", version: "1.0.0",
        subject: `Reset your ${d.brandName} password`,
        preheader: `Use this secure link to reset your password. The link expires in ${d.expiryMinutes} ${d.expiryMinutes === 1 ? "minute" : "minutes"}.`,
        head: { title: d.heading },
        metadata: { category: "authentication", catalog: "builtin", designFamily: "security" },
        body,
        header: { id: "password-secure-empty-header", type: "container" },
        footer: { id: "password-secure-empty-footer", type: "container" },
        copyright: { id: "password-secure-empty-copyright", type: "container" },
    };
    new DocumentValidator().validateOrThrow(document);
    return document;
}
