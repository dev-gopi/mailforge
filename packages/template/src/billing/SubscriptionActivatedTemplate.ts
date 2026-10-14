import { z } from "zod";
import { DocumentValidator, type EmailDocument, type EmailNode } from "@mailforge/core";
import { contentSection, singleColumnSection, styledText, type TemplateNodeStyles } from "../shared/TemplateNodes.js";

const copy = (max: number) => z.string().trim().min(1).max(max)
    .refine(value => !/[\p{Cc}\p{Cf}]/u.test(value), "Control characters are not allowed");
const httpsUrl = z.url().max(2048).refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
}, "A credential-free absolute HTTPS URL is required");
const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a six-digit hex color");
const font = z.enum(["Arial, Helvetica, sans-serif", "Verdana, Geneva, sans-serif", "Tahoma, Arial, sans-serif", "Georgia, Times New Roman, serif"]);
const designSchema = z.object({
    canvas: hex.optional(), primary: hex.optional(), secondary: hex.optional(), surface: hex.optional(),
    text: hex.optional(), muted: hex.optional(), brand: hex.optional(), brandIcon: hex.optional(),
    categoryLabel: hex.optional(), heroLabel: hex.optional(), heroHeading: hex.optional(), heroBody: hex.optional(),
    planLabel: hex.optional(), planText: hex.optional(), divider: hex.optional(), statusDot: hex.optional(),
    statusText: hex.optional(), buttonText: hex.optional(), detailLabel: hex.optional(), detailBorder: hex.optional(),
    footer: hex.optional(), supportLink: hex.optional(),
    fontFamily: font.optional(),
}).strict();

export const subscriptionActivatedSchema = z.object({
    brandName: copy(120), firstName: copy(120), planName: copy(80),
    planPrice: copy(60), billingPeriod: copy(60), nextBillingDate: copy(80),
    manageSubscriptionUrl: httpsUrl, supportUrl: httpsUrl, year: z.number().int().min(2000).max(2200),
    categoryLabel: copy(80).default("ACCOUNT UPDATE"),
    statusLabel: copy(80).default("SUBSCRIPTION ACTIVATED"),
    heroHeading: copy(160).default("You're all\nset."),
    heroBody: copy(250).default("Your membership is now active and ready to use."),
    greetingAfterName: copy(350).default("subscription is confirmed. You can access your plan features right away."),
    planSidebarLabel: copy(80).default("YOUR PLAN"),
    statusIndicatorLabel: copy(80).default("STATUS"),
    statusValue: copy(40).default("Active"),
    priceLabel: copy(80).default("PLAN PRICE"),
    nextBillingLabel: copy(80).default("NEXT BILLING"),
    renewalNote: copy(120).default("Renews automatically"),
    buttonLabel: copy(80).default("Manage subscription \u00a0→"),
    cancelNote: copy(250).default("You can manage or cancel your subscription in your account at any time."),
    supportLabel: copy(80).default("Contact support"),
    design: designSchema.optional(),
}).strict();
export type SubscriptionActivatedData = z.input<typeof subscriptionActivatedSchema>;

export const subscriptionActivatedPreviewData: SubscriptionActivatedData = {
    brandName: "orbit.", firstName: "Alex", planName: "Pro",
    planPrice: "$24.00", billingPeriod: "per month", nextBillingDate: "Nov 14, 2026",
    manageSubscriptionUrl: "https://example.com/account/billing",
    supportUrl: "https://example.com/support", year: 2026,
};

const palette = {
    canvas: "#F5F4F0", primary: "#5031BE", secondary: "#DCFA85", surface: "#FFFFFF",
    text: "#252039", muted: "#565264", brand: "#252039", brandIcon: "#5B38D4",
    categoryLabel: "#797385", heroLabel: "#DEFD86", heroHeading: "#FFFFFF", heroBody: "#E7DEFC",
    planLabel: "#42483A", planText: "#252039", divider: "#ACC85D", statusDot: "#4A6512",
    statusText: "#252039", buttonText: "#FFFFFF", detailLabel: "#807A89", detailBorder: "#E8E6EB",
    footer: "#807A89", supportLink: "#6154A8",
};

export function buildSubscriptionActivatedTemplate(input?: unknown): EmailDocument {
    const d = subscriptionActivatedSchema.parse(input ?? subscriptionActivatedPreviewData);
    const o = d.design;
    const c = {
        canvas: o?.canvas ?? palette.canvas, primary: o?.primary ?? palette.primary,
        secondary: o?.secondary ?? palette.secondary, surface: o?.surface ?? palette.surface,
        text: o?.text ?? palette.text, muted: o?.muted ?? palette.muted,
        brand: o?.brand ?? palette.brand, brandIcon: o?.brandIcon ?? palette.brandIcon,
        categoryLabel: o?.categoryLabel ?? palette.categoryLabel,
        heroLabel: o?.heroLabel ?? palette.heroLabel, heroHeading: o?.heroHeading ?? palette.heroHeading,
        heroBody: o?.heroBody ?? palette.heroBody, planLabel: o?.planLabel ?? palette.planLabel,
        planText: o?.planText ?? palette.planText, divider: o?.divider ?? palette.divider,
        statusDot: o?.statusDot ?? palette.statusDot, statusText: o?.statusText ?? palette.statusText,
        buttonText: o?.buttonText ?? palette.buttonText, detailLabel: o?.detailLabel ?? palette.detailLabel,
        detailBorder: o?.detailBorder ?? palette.detailBorder, footer: o?.footer ?? palette.footer,
        supportLink: o?.supportLink ?? palette.supportLink,
    };
    const family = o?.fontFamily ?? "Arial, Helvetica, sans-serif";
    const body: TemplateNodeStyles = { fontFamily: family, fontSize: 14, lineHeight: "24px", color: c.muted, padding: "0" };
    const label: TemplateNodeStyles = { fontFamily: family, fontSize: 10, lineHeight: "16px", fontWeight: "bold", letterSpacing: "1.6px", color: c.detailLabel, padding: "0" };

    // Hero heading — split on newlines to produce <br> via separate text nodes
    const headingParts = d.heroHeading.split("\n");
    const heroHeadingChildren: EmailNode[] = headingParts.map((part, i) => styledText(
        `sub-activated-hero-line-${i}`, part,
        { fontFamily: family, fontSize: 43, lineHeight: "46px", fontWeight: "800", letterSpacing: "-1.8px", color: c.heroHeading, padding: "0" },
    ));

    const document: EmailDocument = {
        schemaVersion: "1.0", id: "subscription-activated", version: "1.0.0",
        subject: `${d.planName} subscription activated — ${d.brandName}`,
        preheader: `Your ${d.planName} subscription is active. You're ready to go.`,
        head: { title: `${d.planName} subscription activated`, bodyBackgroundColor: c.canvas },
        metadata: { category: "billing", catalog: "builtin", designFamily: "receipt" },
        body: [
            // Brand header bar
            { id: "sub-activated-header", type: "section", attrs: { "data-mf-columns": "keep-mobile" }, styles: { padding: "0 0 22px" }, children: [
                { id: "sub-activated-brand-col", type: "column", styles: { width: "60%", padding: "0" }, children: [
                    { id: "sub-activated-brand", type: "rich-text", props: { segments: [
                        { text: "✳", strong: true, color: c.brandIcon },
                        { text: `\u00a0 ${d.brandName}`, strong: true, color: c.brand },
                    ] }, styles: { fontFamily: family, fontSize: 21, lineHeight: "27px", fontWeight: "800", letterSpacing: "-0.8px", padding: "0" } },
                ] },
                { id: "sub-activated-category-col", type: "column", styles: { width: "40%", padding: "0" }, children: [
                    styledText("sub-activated-category", d.categoryLabel, { fontFamily: family, fontSize: 10, lineHeight: "16px", fontWeight: "bold", letterSpacing: "1.7px", color: c.categoryLabel, textAlign: "right", padding: "0" }),
                ] },
            ] },

            // Split hero panel: primary (left) + secondary (right)
            { id: "sub-activated-hero", type: "section", styles: { padding: "0" }, children: [
                { id: "sub-activated-hero-primary", type: "column", styles: { width: "66%", backgroundColor: c.primary, padding: "42px 36px 43px" }, children: [
                    styledText("sub-activated-hero-label", d.statusLabel, { fontFamily: family, fontSize: 11, lineHeight: "16px", fontWeight: "bold", letterSpacing: "2px", color: c.heroLabel, padding: "0 0 18px" }),
                    ...heroHeadingChildren,
                    { id: "sub-activated-hero-spacer", type: "spacer", props: { height: "19px" }, styles: { padding: "0" } },
                    styledText("sub-activated-hero-body", d.heroBody, { fontFamily: family, fontSize: 14, lineHeight: "23px", color: c.heroBody, padding: "0" }),
                ] },
                { id: "sub-activated-hero-secondary", type: "column", styles: { width: "34%", backgroundColor: c.secondary, padding: "40px 24px 32px" }, children: [
                    styledText("sub-activated-plan-label", d.planSidebarLabel, { ...label, color: c.planLabel, letterSpacing: "1.6px", padding: "0 0 29px" }),
                    styledText("sub-activated-plan-name", d.planName, { fontFamily: family, fontSize: 40, lineHeight: "43px", fontWeight: "800", letterSpacing: "-1.8px", color: c.planText, padding: "0 0 26px" }),
                    { id: "sub-activated-plan-divider", type: "divider", styles: { color: c.divider, padding: "0 0 20px" } },
                    styledText("sub-activated-status-label", d.statusIndicatorLabel, { ...label, color: c.planLabel, letterSpacing: "1.5px", padding: "0 0 7px" }),
                    { id: "sub-activated-status", type: "rich-text", props: { segments: [
                        { text: "●", strong: true, color: c.statusDot },
                        { text: ` ${d.statusValue}`, strong: true, color: c.statusText },
                    ] }, styles: { fontFamily: family, fontSize: 14, lineHeight: "20px", fontWeight: "bold", padding: "0" } },
                ] },
            ] },

            // Content section: greeting + billing details + CTA
            contentSection("sub-activated-content", [
                styledText("sub-activated-greeting", `Hi ${d.firstName},`, { fontFamily: family, fontSize: 18, lineHeight: "25px", fontWeight: "bold", color: c.text, padding: "0 0 10px" }),
                styledText("sub-activated-intro", `Your ${d.planName} ${d.greetingAfterName}`, { ...body, padding: "0 0 29px" }, "body"),
            ], "35px 38px 0", c.surface),

            // Details top divider
            singleColumnSection("sub-activated-details-top-rule", [
                { id: "sub-activated-details-top-div", type: "divider", styles: { color: c.detailBorder, padding: "0" } },
            ], { padding: "0 38px", backgroundColor: c.surface }),

            // Billing details two-column section
            { id: "sub-activated-details", type: "section", attrs: { "data-mf-columns": "keep-mobile" }, styles: { padding: "0 38px", backgroundColor: c.surface }, children: [
                { id: "sub-activated-price-col", type: "column", styles: { width: "50%", padding: "18px 14px 19px 0" }, children: [
                    styledText("sub-activated-price-label", d.priceLabel, { ...label, letterSpacing: "1.1px", padding: "0 0 8px" }),
                    styledText("sub-activated-price-value", d.planPrice, { fontFamily: family, fontSize: 17, lineHeight: "24px", fontWeight: "bold", color: c.text, padding: "0" }),
                    styledText("sub-activated-price-period", d.billingPeriod, { fontFamily: family, fontSize: 12, lineHeight: "19px", color: c.detailLabel, padding: "3px 0 0" }),
                ] },
                { id: "sub-activated-billing-col", type: "column", styles: { width: "50%", padding: "18px 0 19px 20px", borderLeft: `1px solid ${c.detailBorder}` }, children: [
                    styledText("sub-activated-billing-label", d.nextBillingLabel, { ...label, letterSpacing: "1.1px", padding: "0 0 8px" }),
                    styledText("sub-activated-billing-value", d.nextBillingDate, { fontFamily: family, fontSize: 17, lineHeight: "24px", fontWeight: "bold", color: c.text, padding: "0" }),
                    styledText("sub-activated-billing-note", d.renewalNote, { fontFamily: family, fontSize: 12, lineHeight: "19px", color: c.detailLabel, padding: "3px 0 0" }),
                ] },
            ] },

            // Details bottom divider
            singleColumnSection("sub-activated-details-bottom-rule", [
                { id: "sub-activated-details-bottom-div", type: "divider", styles: { color: c.detailBorder, padding: "0" } },
            ], { padding: "0 38px", backgroundColor: c.surface }),

            // Action button + cancel note
            contentSection("sub-activated-action-area", [
                { id: "sub-activated-action", type: "button", props: { href: d.manageSubscriptionUrl, text: d.buttonLabel }, attrs: { "data-mf-style": "primary-action" }, styles: { fontFamily: family, backgroundColor: c.primary, color: c.buttonText, fontSize: 14, fontWeight: "bold", lineHeight: "20px", innerPadding: "14px 24px", borderRadius: "0px", textAlign: "left", padding: "0" } },
                styledText("sub-activated-cancel-note", d.cancelNote, { ...body, fontSize: 12, lineHeight: "20px", color: c.detailLabel, padding: "24px 0 0" }),
            ], "28px 38px 38px", c.surface),

            // Footer
            { id: "sub-activated-footer", type: "section", attrs: { "data-mf-columns": "keep-mobile" }, styles: { padding: "24px 2px 0" }, children: [
                { id: "sub-activated-copyright-col", type: "column", styles: { width: "50%", padding: "0" }, children: [
                    styledText("sub-activated-copyright", `© ${d.year} ${d.brandName}`, { fontFamily: family, fontSize: 12, lineHeight: "19px", color: c.footer, padding: "0" }),
                ] },
                { id: "sub-activated-support-col", type: "column", styles: { width: "50%", padding: "0" }, children: [
                    { id: "sub-activated-support", type: "link", props: { href: d.supportUrl, text: d.supportLabel }, styles: { fontFamily: family, fontSize: 12, lineHeight: "19px", color: c.supportLink, textAlign: "right", padding: "0" } },
                ] },
            ] },
        ],
        header: { id: "sub-activated-empty-header", type: "container" },
        footer: { id: "sub-activated-empty-footer", type: "container" },
        copyright: { id: "sub-activated-empty-copyright", type: "container" },
    };
    new DocumentValidator().validateOrThrow(document);
    return document;
}

