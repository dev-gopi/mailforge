import { describe, expect, it } from "vitest";
import { DocumentValidator } from "@mailforge/core";
import { buildCatalogTemplate, isCatalogTemplateName, listCatalogTemplates } from "../src/catalog/CatalogTemplates.js";
import { buildSubscriptionActivatedTemplate, subscriptionActivatedPreviewData, subscriptionActivatedSchema } from "../src/billing/SubscriptionActivatedTemplate.js";

describe("subscription-activated (#108)", () => {
    it("registers a standalone subscription activation template with a valid document", () => {
        expect(isCatalogTemplateName("subscription-activated")).toBe(true);
        expect(listCatalogTemplates().filter(item => item.id === "subscription-activated")).toHaveLength(1);
        const document = buildCatalogTemplate("subscription-activated");
        expect(document.metadata?.designFamily).toBe("receipt");
        expect(new DocumentValidator().validate(document).valid).toBe(true);
    });

    it("customizes plan facts, palette, typography, and canvas without leaking state", () => {
        const document = buildSubscriptionActivatedTemplate({
            ...subscriptionActivatedPreviewData,
            planName: "Enterprise",
            planPrice: "$99.00",
            design: { primary: "#112233", secondary: "#445566", canvas: "#EEFFEE" },
        });
        const output = JSON.stringify(document);
        expect(output).toContain("Enterprise");
        expect(output).toContain("$99.00");
        expect(output).toContain("#112233");
        expect(output).toContain("#445566");
        expect(document.head?.bodyBackgroundColor).toBe("#EEFFEE");
        expect(JSON.stringify(buildSubscriptionActivatedTemplate())).not.toContain("#112233");
    });

    it("rejects unsafe URLs, control characters, and unknown fields while preserving generic catalog input", () => {
        const data = subscriptionActivatedPreviewData;
        expect(() => subscriptionActivatedSchema.parse({ ...data, manageSubscriptionUrl: "http://example.com/billing" })).toThrow();
        expect(() => subscriptionActivatedSchema.parse({ ...data, supportUrl: "https://user:pass@example.com/support" })).toThrow();
        expect(() => subscriptionActivatedSchema.parse({ ...data, planName: "Pro\nEvil: true" })).toThrow();
        expect(() => subscriptionActivatedSchema.parse({ ...data, unexpected: true })).toThrow();

        const generic = buildCatalogTemplate("subscription-activated", {
            recipientName: "Taylor",
            actionUrl: "https://example.com/account/billing",
        });
        expect(JSON.stringify(generic)).toContain("Taylor");
        expect(JSON.stringify(generic)).toContain("https://example.com/account/billing");
    });
});

