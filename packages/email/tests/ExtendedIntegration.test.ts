import { describe, expect, it } from "vitest";

import {
    createEmail,
    registerExtendedTemplates,
    buildNewsletterTemplate,
    buildPromotionTemplate,
    buildShippingUpdateTemplate,
    buildFeatureShowcaseTemplate,
    getExtendedComponentDefinitions,
    type NewsletterData,
    type PromotionData,
    type ShippingUpdateData,
} from "../src/index.js";

describe("MailForge Extended Components & Templates Integration", () => {
    it("1. registers and renders extended components in MailForgeEmail", async () => {
        const email = createEmail();

        // Register extended components into this email instance
        email.registerComponents(
            getExtendedComponentDefinitions(),
        );

        email.registerTemplate({
            schemaVersion: "1.0",
            id: "callout-demo",
            version: "1.0.0",
            subject: "Alert for you",
            body: [
                {
                    id: "alert",
                    type: "mf-callout-box",
                    props: {
                        title: "Security Update",
                        message: "Two-factor authentication is now mandatory.",
                        variant: "warning",
                    },
                },
                {
                    id: "divider",
                    type: "mf-divider-with-text",
                    props: {
                        text: "DETAILS",
                    },
                },
                {
                    id: "kv",
                    type: "mf-key-value-list",
                    props: {
                        title: "Account Information",
                        items: [
                            { key: "Username", value: "alex_dev" },
                            { key: "Status", value: "Active" },
                        ],
                    },
                },
                {
                    id: "social",
                    type: "mf-social-links",
                    props: {
                        links: [
                            {
                                platform: "github",
                                url: "https://github.com/mailforge",
                            },
                        ],
                    },
                },
            ],
        });

        const result = await email.render("callout-demo");

        expect(result.html).toContain("Security Update");
        expect(result.html).toContain("Two-factor authentication is now mandatory");
        expect(result.html).toContain("DETAILS");
        expect(result.html).toContain("Account Information");
        expect(result.html).toContain("Username: alex_dev");
        expect(result.html).toContain("https://github.com/mailforge");
        expect(result.html).toContain("<!doctype html>");
    });

    it("2. registers and renders the Newsletter template with full data", async () => {
        const email = createEmail();
        registerExtendedTemplates(email);

        const data: NewsletterData = {
            issue: "Issue #42",
            title: "MailForge Product Updates",
            summary: "Catch up on what we built this month.",
            featured: {
                title: "Announcing Enterprise Rendering Engine",
                description: "Sub-millisecond email compilation with full dark mode support.",
                articleUrl: "https://mailforge.dev/blog/enterprise-engine",
                author: "Engineering Team",
            },
            stories: [
                {
                    title: "Best Practices for Transactional Layouts",
                    articleUrl: "https://mailforge.dev/blog/layout-tips",
                },
            ],
            unsubscribeUrl: "https://mailforge.dev/unsubscribe?id=123",
        };

        const newsletterDoc = buildNewsletterTemplate(data);
        email.overrideTemplate(newsletterDoc);

        const result = await email.render("newsletter");

        expect(result.html).toContain("MailForge Product Updates");
        expect(result.html).toContain("Issue: Issue #42");
        expect(result.html).toContain("Announcing Enterprise Rendering Engine");
        expect(result.html).toContain("Best Practices for Transactional Layouts");
        expect(result.html).toContain("Unsubscribe");
    });

    it("3. renders the Promotion template with coupon code and CTA", async () => {
        const email = createEmail();

        const data: PromotionData = {
            title: "Black Friday Early Access: 50% Off",
            description: "Get half off your first year of MailForge Pro.",
            discountCode: "BF50PRO",
            discountPercent: 50,
            expiresOn: "2026-11-28",
            actionUrl: "https://mailforge.dev/checkout?plan=pro&coupon=BF50PRO",
            terms: "Offer limited to first 500 customers.",
        };

        const promoDoc = buildPromotionTemplate(data);
        email.registerTemplate(promoDoc);

        const result = await email.render("promotion");

        expect(result.html).toContain("Black Friday Early Access: 50% Off");
        expect(result.html).toContain("BF50PRO");
        expect(result.html).toContain("SPECIAL OFFER: 50% OFF");
        expect(result.html).toContain("Claim Your Discount");
        expect(result.html).toContain("Offer expires on 2026-11-28");
    });

    it("4. renders the ShippingUpdate template with tracking and status badge", async () => {
        const email = createEmail();

        const data: ShippingUpdateData = {
            customer: { firstName: "Elena" },
            order: { id: "ORD-77492" },
            shipment: {
                carrier: "UPS Express",
                trackingNumber: "1Z9999999999999999",
                trackingUrl: "https://ups.com/track?num=1Z9999999999999999",
                status: "shipped",
                estimatedDelivery: "2026-10-20",
                destinationCity: "Austin, TX",
            },
        };

        const shippingDoc = buildShippingUpdateTemplate(data);
        email.registerTemplate(shippingDoc);

        const result = await email.render("shipping-update");

        expect(result.html).toContain("Your Order is on the Way!");
        expect(result.html).toContain("Shipped &amp; In Transit");
        expect(result.html).toContain("Hello Elena, your package for order #ORD-77492 is moving");
        expect(result.html).toContain("Estimated delivery date: 2026-10-20");
        expect(result.html).toContain("Carrier: UPS Express");
        expect(result.html).toContain("Tracking #: 1Z9999999999999999");
        expect(result.html).toContain("Track Package Online");
    });

    it("5. renders the complete feature showcase template", async () => {
        const email = createEmail();
        email.registerComponents(getExtendedComponentDefinitions());

        email.registerTemplate(buildFeatureShowcaseTemplate({
            recipientName: "Elena",
            title: "Everything in one email",
            summary: "Your complete account and order update is ready.",
            imageUrl: "https://example.com/product.png",
            imageAlt: "Product overview",
            primaryUrl: "https://example.com/orders/ORD-1001",
            secondaryUrl: "https://example.com/support",
            order: {
                id: "ORD-1001",
                currency: "USD",
                items: [{
                    name: "MailForge Pro",
                    quantity: 1,
                    unitPriceCents: 4900,
                }],
            },
            socialLinks: [{
                platform: "github",
                url: "https://github.com/mailforge",
            }],
        }));

        const result = await email.render("feature-showcase");

        expect(result.html).toContain("Everything in one email");
        expect(result.html).toContain("What you can do next");
        expect(result.html).toContain("ORDER SUMMARY");
        expect(result.html).toContain("MailForge Pro");
        expect(result.html).toContain("Account details");
        expect(result.html).toContain("GitHub");
        expect(result.html).toContain('aria-label="GitHub"');
        expect(result.html).toContain("border-radius:8px");
    });
});
