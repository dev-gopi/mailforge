import { describe, expect, it } from "vitest";
import { DocumentValidator } from "@mailforge/core";
import { buildCatalogTemplate, isCatalogTemplateName, listCatalogTemplates } from "../src/catalog/CatalogTemplates.js";
import { buildOrderShippedTemplate, orderShippedSchema, orderShippedPreviewData } from "../src/ecommerce/OrderShippedTemplate.js";
import { buildProgressSteps } from "../src/shared/ProgressSteps.js";

describe("order-shipped-notice (#104)", () => {
    it("is standalone, discoverable and coexists with shipping-update", () => {
        expect(isCatalogTemplateName("order-shipped-notice")).toBe(true);
        expect(listCatalogTemplates().filter(item => item.id === "order-shipped-notice")).toHaveLength(1);
        expect(listCatalogTemplates()).toHaveLength(94);
        const doc = buildCatalogTemplate("order-shipped-notice");
        expect(doc.id).toBe("order-shipped-notice");
        expect(doc.subject).toContain("NL-20481");
        expect(new DocumentValidator().validate(doc).valid).toBe(true);
    });
    it("keeps brand/footer outside the card and ships a real progress tracker", () => {
        const doc = buildOrderShippedTemplate(orderShippedPreviewData);
        expect(doc.body.some(n => n.attrs?.["data-mf-placement"] === "before-shell")).toBe(true);
        expect(doc.body.some(n => n.attrs?.["data-mf-placement"] === "after-shell")).toBe(true);
        const tracker = doc.body.find(n => n.id === "order-shipped-progress");
        expect(tracker?.children).toHaveLength(4);
        expect(tracker?.attrs?.["data-mf-columns"]).toBe("keep-mobile");
        expect(JSON.stringify(tracker)).toContain("Shipped");
        expect(doc.body.some(n => n.id === "order-shipped-tracking-action")).toBe(false);
        expect(JSON.stringify(doc.body)).toContain("order-shipped-tracking-action");
    });
    it("fully customizes copy, shipment milestones and palette without state leakage", () => {
        const changed = buildOrderShippedTemplate({ ...orderShippedPreviewData,
            heading: "Your parcel is moving", carrierName: "Trusted Carrier",
            progressSteps: ["Accepted", "Departed", "Arrived"], currentStep: 2,
            design: { accent: "#112233", panel: "#F0F0F0", fontFamily: "Georgia, Times New Roman, serif" },
        });
        const output = JSON.stringify(changed);
        expect(output).toContain("Your parcel is moving");
        expect(output).toContain("Trusted Carrier");
        expect(output).toContain("Accepted");
        expect(output).toContain("#112233");
        expect(output).toContain("Georgia");
        expect(JSON.stringify(buildOrderShippedTemplate(orderShippedPreviewData))).not.toContain("#112233");
    });
    it("rejects missing fields, unknown fields, invalid status and unsafe URLs", () => {
        const data = orderShippedPreviewData;
        expect(() => orderShippedSchema.parse({ ...data, trackingUrl: "http://example.com/track" })).toThrow();
        expect(() => orderShippedSchema.parse({ ...data, trackingUrl: "https://u:p@example.com/track" })).toThrow();
        expect(() => orderShippedSchema.parse({ ...data, supportUrl: "javascript:alert(1)" })).toThrow();
        expect(() => orderShippedSchema.parse({ ...data, currentStep: 6 })).toThrow();
        expect(() => orderShippedSchema.parse({ ...data, progressSteps: ["Only one"], currentStep: 1 })).toThrow();
        expect(() => orderShippedSchema.parse({ ...data, firstName: "Hi\nBcc:evil" })).toThrow();
        expect(() => orderShippedSchema.parse({ ...data, unknown: "no" })).toThrow();
        expect(() => orderShippedSchema.parse({ ...data, design: { accent: "red" } })).toThrow();
    });
    it("reuses horizontal milestone helper with other ordered processes", () => {
        const node = buildProgressSteps({ id: "approval", steps: ["Draft", "Review", "Published"], currentStep: 2,
            completedColor: "#112233" });
        expect(node.children).toHaveLength(3);
        expect(JSON.stringify(node)).toContain("Review");
        expect(() => buildProgressSteps({ id: "x", steps: ["One"], currentStep: 1 })).toThrow();
        expect(() => buildProgressSteps({ id: "x", steps: ["One", "Two"], currentStep: 3 })).toThrow();
        expect(() => buildProgressSteps({ id: "x", steps: ["One", "Two"], currentStep: 1,
            completedColor: "expression(alert(1))" })).toThrow();
    });
    it("keeps generic catalog consumers working without reducing the strict public schema", () => {
        const doc = buildCatalogTemplate("order-shipped-notice", {
            recipientName: "Sam", actionUrl: "https://example.com/actual-tracking",
        });
        expect(JSON.stringify(doc)).toContain("Sam");
        expect(JSON.stringify(doc)).toContain("https://example.com/actual-tracking");
    });
});
