import { describe, expect, it } from "vitest";

import { DocumentValidator } from "@mailforge/core";

import {
    buildNewsletterTemplate,
    buildPromotionTemplate,
    buildShippingUpdateTemplate,
    getExtendedTemplate,
    listExtendedTemplates,
    getExtendedTemplateInfo,
    EXTENDED_TEMPLATE_NAMES,
    registerExtendedTemplates,
    type NewsletterData,
    type PromotionData,
    type ShippingUpdateData,
} from "../src/index.js";

describe("MailForge Extended Templates", () => {
    const validator = new DocumentValidator();

    it("1. lists all extended templates", () => {
        expect(EXTENDED_TEMPLATE_NAMES).toEqual([
            "newsletter",
            "promotion",
            "shipping-update",
        ]);

        const list = listExtendedTemplates();
        expect(list).toHaveLength(3);
        expect(list.map(t => t.id)).toEqual([
            "newsletter",
            "promotion",
            "shipping-update",
        ]);

        const info = getExtendedTemplateInfo("newsletter");
        expect(info.category).toBe("marketing");
        expect(info.title).toContain("Newsletter");
    });

    it("2. builds valid NewsletterTemplate without data (blueprint with variables)", () => {
        const doc = buildNewsletterTemplate();
        expect(doc.id).toBe("newsletter");
        expect(doc.subject).toBe("{{newsletter.title}}");
        expect(validator.validate(doc).valid).toBe(true);
    });

    it("3. builds valid NewsletterTemplate with data", () => {
        const data: NewsletterData = {
            issue: "Issue #12",
            title: "MailForge October Digest",
            summary: "Exciting updates on template compilation and components.",
            featured: {
                title: "Introducing New Reusable Components",
                description: "Deep dive into CalloutBox, KeyValueList, and SocialLinks.",
                articleUrl: "https://mailforge.dev/blog/new-components",
                author: "Core Team",
            },
            stories: [
                {
                    title: "MJML Optimization Guide",
                    description: "How we achieved sub-millisecond compile times.",
                    articleUrl: "https://mailforge.dev/blog/mjml-guide",
                },
            ],
            unsubscribeUrl: "https://mailforge.dev/unsubscribe?token=abc",
        };

        const doc = buildNewsletterTemplate(data);
        expect(doc.id).toBe("newsletter");
        expect(doc.subject).toBe("MailForge October Digest");
        expect(validator.validate(doc).valid).toBe(true);

        const cardNode = doc.body.find(n => n.type === "mf-content-card");
        expect(cardNode).toBeDefined();
        expect(cardNode?.props?.title).toBe("Introducing New Reusable Components");
    });

    it("4. builds valid PromotionTemplate with data and coupon code", () => {
        const data: PromotionData = {
            title: "Autumn Sale: 35% Off Everything",
            description: "Upgrade your email stack today with our autumn special pricing.",
            discountCode: "AUTUMN35",
            discountPercent: 35,
            expiresOn: "2026-10-31",
            actionUrl: "https://mailforge.dev/pricing?promo=AUTUMN35",
            terms: "Valid on all new annual subscriptions until October 31, 2026.",
        };

        const doc = buildPromotionTemplate(data);
        expect(doc.id).toBe("promotion");
        expect(doc.subject).toBe("Autumn Sale: 35% Off Everything");
        expect(validator.validate(doc).valid).toBe(true);

        const codeNode = doc.body.find(n => n.id === "promo-code-box");
        expect(codeNode).toBeDefined();
        expect(codeNode?.props?.text).toBe("AUTUMN35");
    });

    it("5. builds valid ShippingUpdateTemplate with data and status badge", () => {
        const data: ShippingUpdateData = {
            customer: { firstName: "Sarah" },
            order: { id: "ORD-99281" },
            shipment: {
                carrier: "FedEx Express",
                trackingNumber: "FX-1029384756",
                trackingUrl: "https://fedex.com/track?id=FX-1029384756",
                status: "shipped",
                estimatedDelivery: "2026-10-18",
                destinationCity: "San Francisco, CA",
            },
        };

        const doc = buildShippingUpdateTemplate(data);
        expect(doc.id).toBe("shipping-update");
        expect(validator.validate(doc).valid).toBe(true);

        const badgeNode = doc.body.find(n => n.type === "mf-status-badge");
        expect(badgeNode).toBeDefined();
        expect(badgeNode?.props?.status).toBe("warning");
    });

    it("6. getExtendedTemplate retrieves and builds via registry", () => {
        const doc = getExtendedTemplate("promotion");
        expect(doc.id).toBe("promotion");
        expect(validator.validate(doc).valid).toBe(true);
    });

    it("7. registerExtendedTemplates registers all templates into an engine mock", () => {
        const registered: string[] = [];
        const mockEngine = {
            registerTemplate: (doc: { id: string }) => {
                registered.push(doc.id);
            },
        };

        registerExtendedTemplates(mockEngine);
        expect(registered).toEqual([
            "newsletter",
            "promotion",
            "shipping-update",
        ]);
    });
});
