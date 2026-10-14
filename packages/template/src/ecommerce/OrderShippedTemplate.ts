import { z } from "zod";
import { DocumentValidator, type EmailDocument, type EmailNode } from "@mailforge/core";
import { buildProgressSteps } from "../shared/ProgressSteps.js";
import { contentSection } from "../shared/TemplateNodes.js";

/** Standalone Sky Route shipment notice. Dates and shipment milestones come from the caller. */
const copy = (max: number) => z.string().trim().min(1).max(max)
    .refine(value => !/\p{Cc}/u.test(value), "Control characters are not allowed");
const httpsUrl = z.url().max(2048).refine(value => {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !!parsed.hostname && !parsed.username && !parsed.password;
}, "Absolute credential-free HTTPS URL required");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const font = z.enum(["Arial, Helvetica, sans-serif", "Verdana, Geneva, sans-serif",
    "Tahoma, Arial, sans-serif", "Georgia, Times New Roman, serif"]);
const designSchema = z.object({
    accent: hex.optional(), accentLight: hex.optional(), canvas: hex.optional(), surface: hex.optional(),
    text: hex.optional(), muted: hex.optional(), brand: hex.optional(), border: hex.optional(),
    panel: hex.optional(), panelText: hex.optional(), success: hex.optional(),
    progressPending: hex.optional(), progressLabel: hex.optional(), footer: hex.optional(),
    fontFamily: font.optional(),
}).strict();

export const orderShippedSchema = z.object({
    brandName: copy(120), firstName: copy(120), orderNumber: copy(100),
    deliveryDate: copy(100), carrierName: copy(120), trackingNumber: copy(160),
    trackingUrl: httpsUrl, supportUrl: httpsUrl, companyAddress: copy(350),
    categoryLabel: copy(80).default("ORDER UPDATE"),
    statusLabel: copy(100).default("SHIPPED & ON THE MOVE"),
    heading: copy(160).default("It's on the way"),
    introAfterName: copy(350).default("your order has left our warehouse and is heading to you."),
    estimatedDeliveryLabel: copy(80).default("ESTIMATED DELIVERY"),
    buttonLabel: copy(80).default("Track my package →"),
    orderLabel: copy(80).default("ORDER NUMBER"),
    carrierLabel: copy(80).default("CARRIER / TRACKING"),
    supportPrompt: copy(80).default("Questions?"),
    supportLabel: copy(80).default("Contact support"),
    footerNote: copy(180).default("This is a transactional update about your order."),
    progressSteps: z.array(copy(64)).min(2).max(6)
        .default(["Confirmed", "Packed", "Shipped", "Delivered"]),
    /** One-based status, never inferred from an ETA or tracking number. */
    currentStep: z.number().int().min(0).max(6).default(3),
    design: designSchema.optional(),
}).strict().superRefine((data, ctx) => {
    if (data.currentStep > data.progressSteps.length) ctx.addIssue({
        code: "custom", path: ["currentStep"], message: "currentStep exceeds progressSteps length",
    });
});
export type OrderShippedData = z.input<typeof orderShippedSchema>;

/** Illustrative fixture only. Never use these sample values for a real shipment. */
export const orderShippedPreviewData: OrderShippedData = {
    brandName: "northline", firstName: "Maya", orderNumber: "NL-20481",
    deliveryDate: "Oct 17 – 19", carrierName: "ParcelPost", trackingNumber: "PK9048193",
    trackingUrl: "https://example.com/track/PK9048193", supportUrl: "https://example.com/support",
    companyAddress: "123 Market St, San Francisco, CA 94103",
};

const palette = {
    accent: "#3159D6", accentLight: "#5FA6F6", canvas: "#F1F4FA", surface: "#FFFFFF",
    text: "#142859", muted: "#66738D", brand: "#1C3DB3", border: "#DEE5F3",
    panel: "#EDF3FF", panelText: "#183A99", success: "#0D806C",
    progressPending: "#B9C3D6", progressLabel: "#52668E", footer: "#8490A7",
};
type Styles = NonNullable<EmailNode["styles"]>;
function text(id: string, content: string, styles: Styles): EmailNode {
    return { id, type: "text", props: { text: content }, styles };
}
function twoColumns(id: string, first: EmailNode[], second: EmailNode[], padding: string,
    backgroundColor: string, keepMobile = false): EmailNode {
    return { id, type: "section", styles: { padding, backgroundColor },
        ...(keepMobile ? { attrs: { "data-mf-columns": "keep-mobile" } } : {}),
        children: [
            { id: `${id}-left`, type: "column", styles: { width: "50%", padding: "0" }, children: first },
            { id: `${id}-right`, type: "column", styles: { width: "50%", padding: "0" }, children: second },
        ] };
}

export function buildOrderShippedTemplate(input?: unknown): EmailDocument {
    const d = orderShippedSchema.parse(input ?? orderShippedPreviewData);
    // Resolve every optional token individually: exactOptionalPropertyTypes must never
    // cause `undefined` to replace a concrete design value.
    const design = d.design;
    const c = {
        accent: design?.accent ?? palette.accent,
        accentLight: design?.accentLight ?? palette.accentLight,
        canvas: design?.canvas ?? palette.canvas,
        surface: design?.surface ?? palette.surface,
        text: design?.text ?? palette.text,
        muted: design?.muted ?? palette.muted,
        brand: design?.brand ?? palette.brand,
        border: design?.border ?? palette.border,
        panel: design?.panel ?? palette.panel,
        panelText: design?.panelText ?? palette.panelText,
        success: design?.success ?? palette.success,
        progressPending: design?.progressPending ?? palette.progressPending,
        progressLabel: design?.progressLabel ?? palette.progressLabel,
        footer: design?.footer ?? palette.footer,
    };
    const family = design?.fontFamily ?? "Arial, Helvetica, sans-serif";
    const bodyFont: Styles = { fontFamily: family, fontSize: 15, lineHeight: "25px", color: c.muted, padding: "0" };
    const labelStyle: Styles = { fontFamily: family, fontSize: 10, lineHeight: "16px",
        fontWeight: "bold", letterSpacing: "1.6px", color: c.muted, padding: "0" };
    const body: EmailNode[] = [
        // Existing reusable outside-card feature; branding is not part of the shell.
        { id: "order-shipped-outside-brand", type: "section",
            attrs: { "data-mf-placement": "before-shell", "data-mf-columns": "keep-mobile" },
            styles: { padding: "27px 4px 23px", backgroundColor: c.canvas }, children: [
                { id: "order-shipped-brand-left", type: "column", styles: { width: "65%", padding: "0" }, children: [
                    { id: "order-shipped-brand-name", type: "rich-text", props: { segments: [
                        { text: d.brandName, strong: true, color: c.brand },
                        { text: ".", strong: true, color: c.accentLight },
                    ] }, styles: { fontFamily: family, fontSize: 23, lineHeight: "27px", padding: "0", letterSpacing: "-1px" } },
                ] },
                { id: "order-shipped-brand-right", type: "column", styles: { width: "35%", padding: "0" }, children: [
                    text("order-shipped-category", d.categoryLabel, { ...labelStyle,
                        color: c.muted, textAlign: "right", lineHeight: "27px" }),
                ] },
            ] },
        contentSection("order-shipped-accent-strip", [
            { id: "order-shipped-accent-height", type: "spacer", props: { height: "6px" },
                styles: { padding: "0" } },
        ], "0", c.accent),
        contentSection("order-shipped-intro", [
            { id: "order-shipped-status", type: "rich-text", props: { segments: [
                { text: "●  ", color: c.success }, { text: d.statusLabel, strong: true, color: c.success },
            ] }, styles: { fontFamily: family, fontSize: 11, lineHeight: "19px",
                letterSpacing: "1.4px", padding: "0 0 22px" } },
            { id: "order-shipped-heading", type: "rich-text", props: { segments: [
                { text: d.heading, strong: true, color: c.text },
                { text: ".", strong: true, color: c.accent },
            ] }, styles: { fontFamily: family, fontSize: 42, lineHeight: "48px", letterSpacing: "-1.5px",
                padding: "0 0 17px" } },
            text("order-shipped-intro-copy", `Hi ${d.firstName}, ${d.introAfterName}`, {
                ...bodyFont, padding: "0" }),
        ], "43px 48px 30px", c.surface),
        // A reusable column/panel composition, no copied table markup or custom HTML.
        { id: "order-shipped-delivery-panel", type: "section", styles: {
            padding: "0 48px 34px", backgroundColor: c.surface }, children: [
            { id: "order-shipped-delivery-panel-col", type: "column", styles: {
                backgroundColor: c.panel, padding: "24px 26px" }, children: [
                text("order-shipped-delivery-label", d.estimatedDeliveryLabel, { ...labelStyle,
                    color: c.muted, padding: "0 0 8px" }),
                { id: "order-shipped-delivery-date", type: "rich-text", props: { segments: [
                    { text: d.deliveryDate, strong: true, color: c.panelText },
                    { text: "  ↗", color: c.accent },
                ] }, styles: { fontFamily: family, fontSize: 24, lineHeight: "29px", padding: "0 0 22px" } },
                { id: "order-shipped-tracking-action", type: "button", props: {
                    href: d.trackingUrl, text: d.buttonLabel },
                    attrs: { "data-mf-style": "primary-action" },
                    styles: { fontFamily: family, backgroundColor: c.accent, color: "#FFFFFF",
                        fontSize: 14, fontWeight: "bold", lineHeight: "20px", innerPadding: "15px 24px",
                        width: "100%", borderRadius: "0px", padding: "0", textAlign: "center" } },
            ] },
        ] },
        // The helper is exported for other templates and tracks caller-supplied shipment events.
        { ...buildProgressSteps({ id: "order-shipped-progress", steps: d.progressSteps,
            currentStep: d.currentStep, completedColor: c.accent,
            currentColor: c.accent, pendingColor: c.progressPending,
            labelColor: c.progressLabel, fontFamily: family }),
          styles: { padding: "0 48px 36px", backgroundColor: c.surface } },
        contentSection("order-shipped-details-rule", [
            { id: "order-shipped-details-divider", type: "divider", styles: { color: c.border, padding: "0" } },
        ], "0", c.surface),
        twoColumns("order-shipped-details", [
            text("order-shipped-order-label", d.orderLabel, { ...labelStyle, padding: "0 0 6px" }),
            text("order-shipped-order-number", `#${d.orderNumber.replace(/^#/, "")}`, {
                ...bodyFont, color: c.text, fontSize: 14, fontWeight: "bold", lineHeight: "23px" }),
        ], [
            text("order-shipped-carrier-label", d.carrierLabel, { ...labelStyle, padding: "0 0 6px" }),
            text("order-shipped-carrier-value", `${d.carrierName} · ${d.trackingNumber}`, {
                ...bodyFont, color: c.text, fontSize: 14, fontWeight: "bold", lineHeight: "23px" }),
        ], "26px 48px 32px", c.surface),
        contentSection("order-shipped-outside-footer", [
            { id: "order-shipped-support-link", type: "link", props: {
                href: d.supportUrl, prefix: `${d.supportPrompt} `, text: d.supportLabel, suffix: ".",
            }, styles: { ...bodyFont, textAlign: "center", fontSize: 12, lineHeight: "20px",
                color: c.accent, padding: "0 0 8px" } },
            text("order-shipped-address", `${d.brandName} · ${d.companyAddress}`, {
                ...bodyFont, textAlign: "center", color: c.footer, fontSize: 11,
                lineHeight: "19px", padding: "0 0 3px" }),
            text("order-shipped-transactional-note", d.footerNote, {
                ...bodyFont, textAlign: "center", color: c.footer, fontSize: 10,
                lineHeight: "17px", padding: "0" }),
        ], "24px 18px 12px", c.canvas, { "data-mf-placement": "after-shell" }),
    ];
    const document: EmailDocument = {
        schemaVersion: "1.0", id: "order-shipped-notice", version: "1.0.0",
        subject: `Your order ${d.orderNumber} has shipped`,
        preheader: `Your ${d.brandName} order ${d.orderNumber} is on its way. Track your package online.`,
        head: { title: `Your order has shipped — ${d.brandName}`, bodyBackgroundColor: c.canvas },
        metadata: { category: "ecommerce", catalog: "builtin", designFamily: "delivery" },
        body,
        header: { id: "order-shipped-empty-header", type: "container" },
        footer: { id: "order-shipped-empty-footer", type: "container" },
        copyright: { id: "order-shipped-empty-copyright", type: "container" },
    };
    new DocumentValidator().validateOrThrow(document);
    return document;
}
