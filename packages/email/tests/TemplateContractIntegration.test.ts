
import { describe, expect, it } from "vitest";

import {
    createEmail,
    BuiltinTemplateDataError,
} from "../src/index.js";

const invoiceData = () => ({
    customer: { name: "Rahul" },
    invoice: {
        number: "INV-1001",
        issuedOn: "2026-10-12",
        dueOn: "2026-10-20",
        currency: "USD" as const,
        items: [{
            name: "Notebook",
            quantity: 2,
            unitPriceCents: 2000,
        }],
    },
    paymentUrl: "https://example.com/pay",
});

describe("Template contracts and customization", () => {
    it("exposes contracts through createEmail", () => {
        const email = createEmail();

        const contract = email.getTemplateContract("invoice");

        expect(contract.id).toBe("invoice");
        expect(contract.category).toBe("billing");
        expect(contract.fields.length).toBeGreaterThan(0);
    });

    it("validates data through the public API", () => {
        const email = createEmail();

        expect(
            email.validateTemplateData("otp", {
                code: "004271",
                expiresInMinutes: 5,
            }).code,
        ).toBe("004271");

        expect(() =>
            email.validateTemplateData("otp", {
                code: "invalid",
                expiresInMinutes: 5,
            }),
        ).toThrow(BuiltinTemplateDataError);
    });

    it("allows a custom invoice subject and body", async () => {
        const email = createEmail();

        const result = await email.renderCustomizedBuiltin(
            "invoice",
            invoiceData(),
            draft => {
                draft.subject = "Special Invoice INV-1001";

                draft.body.unshift({
                    id: "custom-intro",
                    type: "text",
                    props: {
                        text: "Thank you for your business.",
                    },
                });
            },
        );

        expect(result.subject).toBe("Special Invoice INV-1001");
        expect(result.html).toContain(
            "Thank you for your business.",
        );
        expect(result.text).toContain("USD 40.00");
    });

    it("supports a theme and button override together", async () => {
        const email = createEmail({
            theme: "corporate",
        });

        const result = await email.renderCustomizedBuiltin(
            "invoice",
            invoiceData(),
            draft => {
                draft.subject = "Branded Invoice";
            },
            {
                theme: {
                    colors: {
                        primary: "#9333ea",
                    },
                },
                patches: [{
                    op: "update",
                    target: "invoice-action",
                    props: {
                        text: "Pay Securely",
                    },
                }],
            },
        );

        expect(result.subject).toBe("Branded Invoice");
        expect(result.html).toContain("Pay Securely");
        expect(result.html).toContain("#9333ea");
    });

    it("supports dynamic text in legacy customization", async () => {
        const email = createEmail();

        const result = await email.renderCustomizedBuiltin(
            "welcome",
            {
                user: { firstName: "Priya" },
                actionUrl: "https://example.com/dashboard",
            },
            draft => {
                draft.subject = "Hello {{user.firstName}}!";
            },
        );

        expect(result.subject).toBe("Hello Priya!");
    });

    it("does not permanently change the built-in", async () => {
        const email = createEmail();

        await email.renderCustomizedBuiltin(
            "welcome",
            {
                user: { firstName: "Rahul" },
                actionUrl: "https://example.com/dashboard",
            },
            draft => {
                draft.subject = "Modified for one email";
            },
        );

        const standard = await email.renderBuiltin(
            "welcome",
            {
                user: { firstName: "Rahul" },
                actionUrl: "https://example.com/dashboard",
            },
        );

        expect(standard.subject).toBe("Welcome, Rahul!");
    });

    it("rejects changing the official template ID", async () => {
        const email = createEmail();

        await expect(
            email.renderCustomizedBuiltin(
                "invoice",
                invoiceData(),
                draft => {
                    draft.id = "wrong-id";
                },
            ),
        ).rejects.toThrow(
            "Invalid customized built-in template",
        );
    });
});
