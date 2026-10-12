
import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createEmail,
    type EmailDocument,
} from "../src/index.js";

function document(
    id: string,
    body: EmailDocument["body"],
): EmailDocument {
    return {
        schemaVersion: "1.0",
        id,
        version: "1.0.0",
        subject: "Composite integration",
        body,
    };
}

describe("MailForge Composite Integration", () => {
    it("1. automatically registers twelve reusable components", () => {
        const email = createEmail();

        const names = email.listComponents().map(
            component => component.name,
        );

        expect(names).toContain("mf-status-badge");
        expect(names).toContain("mf-otp-code");

        expect(names).toContain("mf-content-card");
        expect(names).toContain("mf-button-group");
        expect(names).toContain("mf-price-summary");
        expect(names).toContain("mf-order-item");
        expect(names).toContain("mf-order-summary");
        expect(names).toContain("mf-two-column");
    });

    it("2. renders a themed ContentCard", async () => {
        const email = createEmail({
            theme: {
                colors: {
                    primary: "#9333ea",
                },
            },
        });

        const result = await email.renderDocument(
            document("card-email", [
                {
                    id: "card",
                    type: "mf-content-card",
                    props: {
                        title: "Welcome!",
                        description: "Your account is ready.",
                        actionLabel: "Open Dashboard",
                        actionUrl: "https://example.com/dashboard",
                    },
                    attrs: {
                        "data-card": "welcome",
                    },
                },
            ]),
        );

        expect(result.html).toContain("Welcome!");
        expect(result.html).toContain("Open Dashboard");
        expect(result.html).toContain("#9333ea");
        expect(result.html).toContain("data-card");
    });

    it("3. resolves nested button-group variables", async () => {
        const email = createEmail();

        const source = document("buttons", [
            {
                id: "actions",
                type: "mf-button-group",
                props: {
                    items: [
                        {
                            label: "Approve",
                            href: "{{links.approve}}",
                        },
                        {
                            label: "Details",
                            href: "{{links.details}}",
                        },
                    ],
                },
            },
        ]);

        email.registerTemplate(source);

        const result = await email.render("buttons", {
            data: {
                links: {
                    approve: "https://example.com/approve",
                    details: "https://example.com/details",
                },
            },
        });

        expect(result.html).toContain("Approve");
        expect(result.html).toContain("Details");
        expect(result.html).toContain(
            "https://example.com/approve",
        );
    });

    it("4. applies patches before OrderSummary expansion", async () => {
        const email = createEmail();

        const source = document("order-email", [
            {
                id: "order",
                type: "mf-order-summary",
                props: {
                    orderId: "100",
                    items: [
                        {
                            name: "Notebook",
                            quantity: 1,
                            unitPriceCents: 1000,
                        },
                    ],
                },
            },
        ]);

        email.registerTemplate(source);

        const result = await email.render("order-email", {
            patches: [
                {
                    op: "update",
                    target: "order",
                    props: {
                        orderId: "101",
                        items: [
                            {
                                name: "Notebook",
                                quantity: 2,
                                unitPriceCents: 1000,
                            },
                        ],
                    },
                },
            ],
        });

        expect(result.html).toContain("Order #101");
        expect(result.text).toContain("USD 20.00");

        expect(
            email.getTemplate("order-email")
                .body[0]?.props?.orderId,
        ).toBe("100");
    });

    it("5. renders a responsive two-column section", async () => {
        const email = createEmail();

        const result = await email.renderDocument(
            document("columns", [
                {
                    id: "features",
                    type: "mf-two-column",
                    props: {
                        leftTitle: "Feature A",
                        leftText: "Fast delivery",
                        rightTitle: "Feature B",
                        rightText: "Secure checkout",
                    },
                },
            ]),
        );

        expect(result.html).toContain("Feature A");
        expect(result.html).toContain("Feature B");
        expect(result.text).toContain("Fast delivery");
        expect(result.text).toContain("Secure checkout");
    });

    it("6. rejects nested sections inside columns", async () => {
        const email = createEmail();

        const source = document("invalid-layout", [
            {
                id: "outer-section",
                type: "section",
                children: [
                    {
                        id: "outer-column",
                        type: "column",
                        children: [
                            {
                                id: "inner-layout",
                                type: "mf-two-column",
                                props: {
                                    leftTitle: "Left",
                                    leftText: "Left content",
                                    rightTitle: "Right",
                                    rightText: "Right content",
                                },
                            },
                        ],
                    },
                ],
            },
        ]);

        await expect(
            email.renderDocument(source),
        ).rejects.toThrow(
            "not valid inside an MJML column",
        );
    });

    it("7. preserves existing built-in templates", async () => {
        const email = createEmail();

        const result = await email.render("welcome", {
            data: {
                user: {
                    firstName: "John",
                },
                actionUrl: "https://example.com/dashboard",
            },
        });

        expect(result.subject).toBe("Welcome, John!");
        expect(result.html).toContain("Open Your Dashboard");
    });

    it("8. rejects unsafe dynamic composite URLs", async () => {
        const email = createEmail();

        const source = document("dynamic-link", [
            {
                id: "actions",
                type: "mf-button-group",
                props: {
                    items: [
                        {
                            label: "Open",
                            href: "{{actionUrl}}",
                        },
                    ],
                },
            },
        ]);

        email.registerTemplate(source);

        await expect(
            email.render("dynamic-link", {
                data: {
                    actionUrl: "javascript:alert(1)",
                },
            }),
        ).rejects.toThrow();
    });
});
