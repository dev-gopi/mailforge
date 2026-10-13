import { describe, expect, it } from "vitest";
import {
    billingCatalogTemplateDataSchema,
    ecommerceCatalogTemplateDataSchema,
    buildCatalogTemplate,
} from "@mailforge/templates";
import { createEmail } from "../src/index.js";

const base = {
    recipientName: "Gopi",
    actionUrl: "https://example.com/account",
};

describe("billing and ecommerce catalog", () => {
    it("validates and builds theme-aware billing details", () => {
        const data = {
            ...base,
            billing: {
                referenceId: "INV-2026-10",
                planName: "Premium",
                currency: "INR",
                amount: "1299.00",
                billingDate: "2026-10-13",
            },
        };
        expect(billingCatalogTemplateDataSchema.parse(data)).toEqual(data);
        const doc = buildCatalogTemplate("subscription-renewed", data);
        const json = JSON.stringify(doc.body);
        expect(json).toContain("subscription-renewed-billing-details");
        expect(json).toContain("Reference: INV-2026-10");
        expect(json).toContain("Plan: Premium");
        expect(json).toContain("Amount: INR 1299.00");
        expect(json).toContain("Billing date: 2026-10-13");
    });

    it("validates and builds ecommerce tracking details", () => {
        const data = {
            ...base,
            ecommerce: {
                orderId: "ORDER-42",
                trackingNumber: "TRACK-101",
                carrier: "Demo Express",
                estimatedDelivery: "2026-10-22",
            },
        };
        expect(ecommerceCatalogTemplateDataSchema.parse(data)).toEqual(data);
        const doc = buildCatalogTemplate("order-delivered", data);
        const json = JSON.stringify(doc.body);
        expect(json).toContain("order-delivered-ecommerce-details");
        expect(json).toContain("Order: ORDER-42");
        expect(json).toContain("Tracking: TRACK-101");
        expect(json).toContain("Carrier: Demo Express");
        expect(json).toContain("Estimated delivery: 2026-10-22");
    });

    it("renders billing and ecommerce through the public API", async () => {
        const email = createEmail();
        const bill = await email.render("payment-failed", {
            data: { ...base, billing: { currency: "USD", amount: "0.00" } },
            variant: "compact",
        });
        expect(bill.text).toContain("Amount: USD 0.00");
        const order = await email.render("order-cancelled", {
            data: { ...base, ecommerce: { orderId: "ORDER-42" } },
        });
        expect(order.text).toContain("Order: ORDER-42");
    });

    it("can hide optional detail panels without hiding the action", async () => {
        const email = createEmail();
        const hidden = await email.render("refund-processed", {
            data: { ...base, billing: { referenceId: "REF-55" } },
            display: { hideIds: ["refund-processed-billing-details"], heading: false },
        });
        expect(hidden.text).not.toContain("REF-55");
        expect(hidden.html).toContain("https://example.com/account");
    });

    it("keeps legacy data-only template calls working", async () => {
        const email = createEmail();
        const billing = await email.render("refund-processed", { data: base });
        const ecommerce = await email.render("cart-reminder", { data: base });
        expect(billing.text.length).toBeGreaterThan(0);
        expect(ecommerce.text.length).toBeGreaterThan(0);
        expect(buildCatalogTemplate("payment-failed", base).id).toBe("payment-failed");
        expect(buildCatalogTemplate("order-delivered", base).id).toBe("order-delivered");
    });

    it("rejects invalid or incomplete money and date fields", () => {
        for (const billing of [
            { amount: "12.00" },
            { currency: "USD" },
            { currency: "usd", amount: "12.00" },
            { currency: "USD", amount: "-12.00" },
            { currency: "USD", amount: "1e9" },
            { billingDate: "13/10/2026" },
        ]) {
            expect(() => buildCatalogTemplate("payment-failed", { ...base, billing })).toThrow();
        }
    });

    it("rejects invalid order metadata and cross-category extra fields", () => {
        expect(() => buildCatalogTemplate("order-delivered", {
            ...base, ecommerce: { orderId: "bad order!" },
        })).toThrow();
        expect(() => buildCatalogTemplate("cart-reminder", {
            ...base, ecommerce: { estimatedDelivery: "tomorrow" },
        })).toThrow();
        expect(() => buildCatalogTemplate("order-cancelled", {
            ...base, billing: { referenceId: "INV-1" },
        })).toThrow();
        expect(() => buildCatalogTemplate("payment-failed", {
            ...base, ecommerce: { orderId: "ORDER-42" },
        })).toThrow();
        expect(() => buildCatalogTemplate("account-activated", {
            ...base, billing: { currency: "USD", amount: "5.00" },
        })).toThrow();
    });

    it("does not change marketing unsubscribe requirements", () => {
        expect(() => buildCatalogTemplate("product-launch", base)).toThrow();
        expect(buildCatalogTemplate("product-launch", {
            ...base, unsubscribeUrl: "https://example.com/unsubscribe",
        }).id).toBe("product-launch");
    });
});
