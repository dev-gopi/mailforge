import { z } from "zod";
import { DocumentValidator, type EmailDocument, type EmailNode } from "@mailforge/core";
import { contentSection } from "../shared/TemplateNodes.js";

/** Secure, standalone new-comment notification with a configurable warm-minimal design. */
const copy = (limit: number) => z.string().trim().min(1).max(limit)
    .refine(value => !/\p{Cc}/u.test(value), "Control characters are not permitted");
const httpsUrl = z.string().url().max(2048).refine(value => {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
}, "Expected an absolute credential-free HTTPS URL");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const designSchema = z.object({
    accent: hex.optional(),
    button: hex.optional(),
    surface: hex.optional(),
    canvas: hex.optional(),
    text: hex.optional(),
    muted: hex.optional(),
    quoteBackground: hex.optional(),
    quoteBorder: hex.optional(),
    cardBorder: hex.optional(),
    fontFamily: z.enum(["Tahoma, Arial, sans-serif", "Arial, Helvetica, sans-serif",
        "Verdana, Geneva, sans-serif", "Georgia, Times New Roman, serif"]).optional(),
}).strict();

export const activityNotificationSchema = z.object({
    brandName: copy(120),
    recipientName: copy(120),
    actorName: copy(120),
    itemName: copy(200),
    commentExcerpt: copy(2000),
    actionUrl: httpsUrl,
    preferencesUrl: httpsUrl,
    year: z.number().int().min(2000).max(3000),
    categoryLabel: copy(60).default("ACTIVITY"),
    kicker: copy(80).default("NEW COMMENT"),
    heading: copy(160).default("A new comment for you"),
    greetingPrefix: copy(40).default("Hi"),
    commentVerb: copy(80).default("commented on"),
    quoteLabel: copy(80).default("COMMENT"),
    buttonLabel: copy(80).default("View comment →"),
    footerNote: copy(280).default("You're receiving this because you're part of this conversation."),
    preferencesLabel: copy(120).default("Notification preferences"),
    design: designSchema.optional(),
}).strict();
export type ActivityNotificationData = z.input<typeof activityNotificationSchema>;

/** Built-in gallery sample only; real delivery always takes validated caller data. */
export const activityNotificationPreviewData: ActivityNotificationData = {
    brandName: "huddle", recipientName: "Jordan", actorName: "Mira Patel",
    itemName: "Design handoff", commentExcerpt: "The updated screens are ready for your review.",
    actionUrl: "https://example.com/discussions/123",
    preferencesUrl: "https://example.com/settings/notifications", year: 2026,
};

type Style = NonNullable<EmailNode["styles"]>;
const palette = {
    accent: "#bf653d", button: "#a8512f", surface: "#ffffff", canvas: "#f7f4ef",
    text: "#252523", muted: "#81786e", quoteBackground: "#fbf8f3",
    quoteBorder: "#bd6a40", cardBorder: "#e9e3d9",
};
function rich(id: string, fragments: Array<{ text: string; strong?: boolean; color?: string }>, styles: Style): EmailNode {
    return { id, type: "rich-text", props: { segments: fragments }, styles,
        attrs: { "data-mf-font": "corporate" } };
}
function text(id: string, value: string, styles: Style): EmailNode {
    return { id, type: "text", props: { text: value }, styles, attrs: { "data-mf-font": "corporate" } };
}
/** Standard EmailDocument; no HTML snippets, third-party fonts, or unsafe interpolation. */
export function buildActivityNotificationTemplate(input?: unknown): EmailDocument {
    const data = activityNotificationSchema.parse(input ?? activityNotificationPreviewData);
    // Optional design overrides must not replace the safe palette defaults
    // with `undefined` (notably with exactOptionalPropertyTypes enabled).
    const design = data.design;
    const c = {
        accent: design?.accent ?? palette.accent,
        button: design?.button ?? palette.button,
        surface: design?.surface ?? palette.surface,
        canvas: design?.canvas ?? palette.canvas,
        text: design?.text ?? palette.text,
        muted: design?.muted ?? palette.muted,
        quoteBackground: design?.quoteBackground ?? palette.quoteBackground,
        quoteBorder: design?.quoteBorder ?? palette.quoteBorder,
        cardBorder: design?.cardBorder ?? palette.cardBorder,
    };
    const font = design?.fontFamily ?? "Tahoma, Arial, sans-serif";
    const base: Style = { fontFamily: font, fontSize: 14, lineHeight: "23px", color: c.text, padding: "0" };
    const body: EmailNode[] = [
        {
            id: "activity-brand-bar", type: "section", styles: { padding: "26px 36px", backgroundColor: c.surface },
            attrs: { "data-mf-columns": "keep-mobile" },
            children: [
                { id: "activity-brand-left", type: "column", styles: { width: "72%", padding: "0" }, children: [
                    rich("activity-brand", [
                        { text: "●", color: c.accent }, { text: "  " }, { text: data.brandName, strong: true },
                    ], { ...base, fontSize: 19, lineHeight: "25px", color: c.text }),
                ] },
                { id: "activity-brand-right", type: "column", styles: { width: "28%", padding: "0" }, children: [
                    text("activity-category", data.categoryLabel, { ...base, color: c.muted,
                        fontSize: 10, lineHeight: "25px", fontWeight: "bold", letterSpacing: "1.2px", textAlign: "right" }),
                ] },
            ],
        },
        contentSection("activity-divider", [{ id: "activity-divider-line", type: "divider", styles: { color: c.cardBorder, padding: "0" } }], "0", c.surface),
        contentSection("activity-intro", [
            text("activity-kicker", data.kicker, { ...base, fontWeight: "bold", fontSize: 11,
                lineHeight: "18px", letterSpacing: "1.4px", color: c.accent, padding: "0 0 10px" }),
            { id: "activity-heading", type: "heading", props: { text: data.heading, level: 1 },
                styles: { ...base, fontSize: 29, fontWeight: "bold", lineHeight: "36px", padding: "0 0 17px" } },
            text("activity-greeting", `${data.greetingPrefix} ${data.recipientName},`, {
                ...base, color: c.muted, padding: "0 0 7px" }),
            rich("activity-introduction", [
                { text: data.actorName, strong: true }, { text: ` ${data.commentVerb} ` },
                { text: data.itemName, strong: true }, { text: "." },
            ], { ...base, color: c.muted, padding: "0 0 24px" }),
        ], "38px 36px 0", c.surface),
        { id: "activity-quote", type: "section", styles: { backgroundColor: c.surface, padding: "0 36px" },
            children: [{ id: "activity-quote-panel", type: "column", attrs: { "data-mf-style": "quote-panel" },
                styles: { backgroundColor: c.quoteBackground, borderLeft: `3px solid ${c.quoteBorder}`,
                    borderRadius: "8px", padding: "21px 23px" }, children: [
                    text("activity-comment-label", data.quoteLabel, { ...base, fontWeight: "bold",
                        fontSize: 11, lineHeight: "16px", letterSpacing: "0.9px", color: c.accent, padding: "0 0 9px" }),
                    text("activity-comment", data.commentExcerpt, { ...base, color: c.text, padding: "0" }),
                ] }],
        },
        contentSection("activity-action-row", [{ id: "activity-action", type: "button", props: {
            href: data.actionUrl, text: data.buttonLabel }, attrs: { "data-mf-style": "primary-action" },
            styles: { fontFamily: font, fontSize: 13, fontWeight: "bold", lineHeight: "21px",
                backgroundColor: c.button, color: "#ffffff", textAlign: "left", innerPadding: "13px 22px",
                borderRadius: "6px", padding: "27px 0 41px" } }], "0 36px", c.surface),
        {
            id: "activity-outside-footer", type: "section", attrs: { "data-mf-placement": "after-shell" },
            styles: { padding: "24px 16px", backgroundColor: c.canvas }, children: [
                { id: "activity-outside-footer-column", type: "column", children: [
                    text("activity-footer-note", data.footerNote, { ...base, color: c.muted, fontSize: 11,
                        lineHeight: "19px", textAlign: "center", padding: "0 0 6px" }),
                    { id: "activity-preferences", type: "link", props: {
                        href: data.preferencesUrl, text: data.preferencesLabel,
                        suffix: `  ·  © ${data.year} ${data.brandName}` },
                        styles: { ...base, color: c.button, fontSize: 11, lineHeight: "19px", textAlign: "center", padding: "0" } },
                ] },
            ],
        },
    ];
    const document: EmailDocument = {
        schemaVersion: "1.0", id: "activity-notification", version: "1.0.0",
        subject: `${data.actorName} commented on ${data.itemName}`,
        preheader: `${data.actorName} commented on ${data.itemName}.`,
        head: { title: data.heading, bodyBackgroundColor: c.canvas },
        metadata: { category: "notifications", catalog: "builtin", designFamily: "conversation" },
        body,
        header: { id: "activity-layout-header", type: "container" },
        footer: { id: "activity-layout-footer", type: "container" },
        copyright: { id: "activity-layout-copyright", type: "container" },
    };
    new DocumentValidator().validateOrThrow(document);
    return document;
}
