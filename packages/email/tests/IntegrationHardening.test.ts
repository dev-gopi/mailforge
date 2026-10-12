
import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createEmail,
    assertRenderBudget,
    EmailRenderBudgetError,
    type EmailDocument,
} from "../src/index.js";

function sample(
    text: string,
): EmailDocument {
    return {
        schemaVersion: "1.0",
        id: "budget-test",
        version: "1.0.0",
        subject: "Budget test",
        body: [
            {
                id: "message",
                type: "text",
                props: { text },
            },
        ],
    };
}

describe("MailForge Integration Hardening", () => {
    it("1. exposes template catalog categories", () => {
        const email = createEmail();

        const authentication =
            email.listTemplateCatalog("authentication");

        expect(authentication.map(item => item.id))
            .toEqual(["otp", "password-reset"]);

        expect(
            email.getBuiltinTemplateInfo("welcome").category,
        ).toBe("account");
    });

    it("2. keeps the existing welcome template", async () => {
        const email = createEmail();

        const result = await email.render("welcome", {
            data: {
                user: {
                    firstName: "Rahul",
                },
                actionUrl: "https://example.com/dashboard",
            },
        });

        expect(result.subject).toBe("Welcome, Rahul!");
        expect(result.html).toContain("Open Your Dashboard");
    });

    it("3. keeps the existing OTP template", async () => {
        const email = createEmail();

        const result = await email.render("otp", {
            data: {
                code: "004271",
                expiresInMinutes: 5,
            },
        });

        expect(result.text).toContain("004271");
        expect(result.text).toContain("5 minutes");
    });

    it("4. still prioritizes custom templates", async () => {
        const email = createEmail();

        email.registerTemplate({
            schemaVersion: "1.0",
            id: "welcome",
            version: "1.0.0",
            subject: "My Custom Welcome",
            body: [
                {
                    id: "custom",
                    type: "text",
                    props: {
                        text: "Custom content",
                    },
                },
            ],
        });

        const result = await email.render("welcome");

        expect(result.subject)
            .toBe("My Custom Welcome");

        expect(result.html).toContain("Custom content");
    });

    it("5. renders a built-in with a composite patch", async () => {
        const email = createEmail();

        const result = await email.render("notification", {
            data: {
                title: "Order Update",
                message: "Your order has been placed.",
                actionUrl: "https://example.com/orders",
            },
            patches: [
                {
                    op: "slot",
                    slot: "body.end",
                    nodes: [
                        {
                            id: "summary",
                            type: "mf-price-summary",
                            props: {
                                currency: "USD",
                                subtotalCents: 4000,
                                shippingCents: 500,
                                discountCents: 200,
                            },
                        },
                    ],
                },
            ],
        });

        expect(result.subject).toBe("Order Update");
        expect(result.text).toContain("USD 43.00");
    });

    it("6. rejects excessive resolved document size", () => {
        expect(() => {
            assertRenderBudget(
                sample("A".repeat(600_000)),
            );
        }).toThrow(EmailRenderBudgetError);
    });

    it("7. rejects excessive raw HTML", () => {
        const document = sample("Hello");

        document.body.push({
            id: "raw",
            type: "raw-html",
            props: {
                html: "x".repeat(70_000),
            },
        });

        expect(() => {
            assertRenderBudget(document);
        }).toThrow("raw HTML is too large");
    });
});
