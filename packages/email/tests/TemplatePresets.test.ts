import { describe, expect, it } from "vitest";

import {
    createEmail,
    TemplatePresetError,
    BuiltinTemplateDataError,
} from "../src/index.js";

function invoiceData() {
    return {
        customer: { name: "Rahul" },
        invoice: {
            number: "INV-1001",
            issuedOn: "2026-10-12",
            dueOn: "2026-10-20",
            currency: "USD" as const,
            items: [
                {
                    name: "Notebook",
                    quantity: 2,
                    unitPriceCents: 2000,
                },
            ],
        },
        paymentUrl: "https://example.com/pay",
    };
}

describe("MailForge Task 7.8.2.2", () => {
    it("1. validates domain data and applies defaults", () => {
        const email = createEmail();

        const data = email.validateTemplateData(
            "invoice",
            invoiceData(),
        );

        expect(data.invoice.shippingCents).toBe(0);
        expect(data.invoice.discountCents).toBe(0);
    });

    it("2. registers a theme profile", () => {
        const email = createEmail();

        email.registerThemeProfile("violet", {
            colors: { primary: "#9333ea" },
        });

        expect(email.listThemeProfiles())
            .toEqual(["violet"]);
    });

    it("3. registers a reusable template preset", () => {
        const email = createEmail();

        email.registerTemplatePreset({
            id: "premium-invoice",
            template: "invoice",
        });

        expect(email.listTemplatePresets()).toEqual([
            {
                id: "premium-invoice",
                template: "invoice",
            },
        ]);
    });

    it("4. renders a customized invoice", async () => {
        const email = createEmail();

        email.registerTemplatePreset({
            id: "premium-invoice",
            template: "invoice",
            customize: draft => {
                draft.subject = "Premium Invoice";

                draft.body.unshift({
                    id: "premium-introduction",
                    type: "text",
                    props: {
                        text: "Thank you for choosing us.",
                    },
                });
            },
        });

        const result = await email.renderPreset(
            "premium-invoice",
            invoiceData(),
        );

        expect(result.subject).toBe("Premium Invoice");
        expect(result.text).toContain("USD 40.00");
        expect(result.html).toContain(
            "Thank you for choosing us.",
        );
    });

    it("5. applies a saved theme profile", async () => {
        const email = createEmail();

        email.registerThemeProfile("violet", {
            colors: { primary: "#9333ea" },
        });

        email.registerTemplatePreset({
            id: "violet-invoice",
            template: "invoice",
            themeProfile: "violet",
        });

        const result = await email.renderPreset(
            "violet-invoice",
            invoiceData(),
        );

        expect(result.html).toContain("#9333ea");
    });

    it("6. allows an individual theme override", async () => {
        const email = createEmail();

        email.registerThemeProfile("violet", {
            colors: { primary: "#9333ea" },
        });

        const result = await email.render(
            "invoice",
            {
                data: invoiceData(),
                themeProfile: "violet",
                theme: {
                    colors: { primary: "#2563eb" },
                },
            },
        );

        expect(result.html).toContain("#2563eb");

        expect(
            email.getThemeProfile("violet")
                ?.colors?.primary,
        ).toBe("#9333ea");
    });

    it("7. applies one-off patches after preset patches", async () => {
        const email = createEmail();

        email.registerTemplatePreset({
            id: "patched-invoice",
            template: "invoice",
            patches: [
                {
                    op: "update",
                    target: "invoice-heading",
                    props: {
                        text: "Preset Invoice",
                    },
                },
            ],
        });

        const result = await email.renderPreset(
            "patched-invoice",
            invoiceData(),
            {
                patches: [
                    {
                        op: "update",
                        target: "invoice-heading",
                        props: {
                            text: "Final Invoice",
                        },
                    },
                ],
            },
        );

        expect(result.html).toContain("Final Invoice");
        expect(result.html).not.toContain("Preset Invoice");
    });

    it("8. never permanently changes a built-in", async () => {
        const email = createEmail();

        email.registerTemplatePreset({
            id: "custom-invoice",
            template: "invoice",
            customize: draft => {
                draft.subject = "Changed Subject";
            },
        });

        await email.renderPreset(
            "custom-invoice",
            invoiceData(),
        );

        const standard = await email.renderBuiltin(
            "invoice",
            invoiceData(),
        );

        expect(standard.subject).toBe("Invoice INV-1001");
    });

    it("9. rejects invalid business data", async () => {
        const email = createEmail();

        email.registerTemplatePreset({
            id: "strict-invoice",
            template: "invoice",
        });

        await expect(
            email.renderPreset("strict-invoice", {
                ...invoiceData(),
                paymentUrl: "javascript:alert(1)",
            }),
        ).rejects.toBeInstanceOf(
            BuiltinTemplateDataError,
        );
    });

    it("10. rejects unknown presets", async () => {
        const email = createEmail();

        await expect(
            email.renderPreset("missing", invoiceData()),
        ).rejects.toThrow(TemplatePresetError);
    });

    it("11. preserves custom-template priority", async () => {
        const email = createEmail();

        email.registerTemplate({
            schemaVersion: "1.0",
            id: "invoice",
            version: "1.0.0",
            subject: "Developer Invoice",
            body: [
                {
                    id: "custom",
                    type: "text",
                    props: {
                        text: "Developer content",
                    },
                },
            ],
        });

        const result = await email.render("invoice");

        expect(result.subject).toBe("Developer Invoice");
        expect(result.text).toContain("Developer content");
    });

    it("12. preserves the original welcome template", async () => {
        const email = createEmail();

        const result = await email.render("welcome", {
            data: {
                user: { firstName: "Priya" },
                actionUrl: "https://example.com/home",
            },
        });

        expect(result.subject).toBe("Welcome, Priya!");
    });
});
