
import { describe, expect, it } from "vitest";

import {
    TemplateContractRegistry,
    BuiltinTemplateDataError,
} from "../src/index.js";

const registry = new TemplateContractRegistry();

const invoiceData = () => ({
    customer: { name: "Rahul" },
    invoice: {
        number: "INV-1001",
        issuedOn: "2026-10-12",
        dueOn: "2026-10-20",
        currency: "USD",
        items: [{
            name: "Notebook",
            quantity: 2,
            unitPriceCents: 2000,
        }],
    },
    paymentUrl: "https://example.com/pay",
});

describe("Unified template contracts", () => {
    it("lists all nine contracts", () => {
        expect(registry.list()).toHaveLength(10);
    });

    it("exposes required OTP fields", () => {
        const contract = registry.get("otp");

        expect(contract.category).toBe("authentication");

        expect(contract.fields).toContainEqual({
            path: "code",
            type: "text",
            required: true,
        });
    });

    it("exposes optional invoice defaults", () => {
        const contract = registry.get("invoice");

        expect(contract.dataDriven).toBe(true);

        expect(contract.fields).toContainEqual({
            path: "invoice.shippingCents",
            type: "integer",
            required: false,
            defaultValue: 0,
        });
    });

    it("validates OTP values", () => {
        const data = registry.validate("otp", {
            code: "004271",
            expiresInMinutes: 5,
        });

        expect(data.code).toBe("004271");
    });

    it("rejects invalid OTP input with a field path", () => {
        expect(() =>
            registry.validate("otp", {
                code: "ABCD",
                expiresInMinutes: 5,
            }),
        ).toThrow(BuiltinTemplateDataError);
    });

    it("applies domain monetary defaults", () => {
        const data = registry.validate(
            "invoice",
            invoiceData(),
        );

        expect(data.invoice.shippingCents).toBe(0);
        expect(data.invoice.discountCents).toBe(0);
    });

    it("keeps additional legacy patch data", () => {
        const data = registry.validate("welcome", {
            user: { firstName: "Rahul" },
            actionUrl: "https://example.com/dashboard",
            campaign: { label: "VIP" },
        });

        expect(
            (data as Record<string, unknown>).campaign,
        ).toEqual({ label: "VIP" });
    });

    it("returns isolated metadata objects", () => {
        const first = registry.get("invoice");
        const second = registry.get("invoice");

        Object.assign(first.fields[0]!, {
            path: "modified",
        });

        expect(second.fields[0]?.path).not.toBe("modified");
    });
});
