import {
    describe,
    expect,
    it,
} from "vitest";

import {
    DocumentValidator,
    type EmailDocument,
} from "../src/index.js";

const validator = new DocumentValidator();

function createDocument(): EmailDocument {
    return {
        schemaVersion: "1.0",
        id: "welcome",
        version: "1.0.0",
        subject: "Welcome to MailForge",

        header: {
            id: "header",
            type: "header",
            props: {
                title: "MailForge",
            },
        },

        body: [
            {
                id: "welcome-title",
                type: "heading",
                props: {
                    text: "Welcome!",
                },
                attrs: {
                    "data-component": "welcome-title",
                    "aria-label": "Welcome heading",
                },
            },
            {
                id: "welcome-button",
                type: "button",
                props: {
                    text: "Get Started",
                    href: "https://example.com",
                },
            },
        ],

        footer: {
            id: "footer",
            type: "footer",
        },

        copyright: {
            id: "copyright",
            type: "copyright",
            props: {
                text: "© 2026 MailForge",
            },
        },
    };
}

describe("DocumentValidator", () => {
    it("accepts a valid email document", () => {
        const result = validator.validate(
            createDocument(),
        );

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it("rejects a missing subject", () => {
        const document = {
            ...createDocument(),
            subject: "",
        };

        expect(
            validator.validate(document).valid,
        ).toBe(false);
    });

    it("rejects control characters in email headers", () => {
        const document = createDocument();
        document.subject = "Welcome\u0000";
        document.preheader = "Preview\ntext";

        expect(validator.validate(document).valid).toBe(false);
    });

    it("rejects duplicate node IDs", () => {
        const document = createDocument();

        document.body.push({
            id: "welcome-title",
            type: "text",
        });

        const result = validator.validate(document);

        expect(result.valid).toBe(false);
        expect(
            result.errors.some(
                (error) =>
                    error.message.includes("Duplicate"),
            ),
        ).toBe(true);
    });

    it("allows custom data attributes", () => {
        const document = createDocument();

        document.body.push({
            id: "tracking-block",
            type: "text",
            attrs: {
                "data-campaign": "welcome-2026",
                "data-user-type": "customer",
            },
        });

        expect(
            validator.validate(document).valid,
        ).toBe(true);
    });

    it("rejects unsafe event attributes", () => {
        const document = createDocument();

        document.body.push({
            id: "unsafe-button",
            type: "button",
            attrs: {
                onclick: "alert(1)",
            },
        });

        const result = validator.validate(document);

        expect(result.valid).toBe(false);
    });

    it("rejects invalid template versions", () => {
        const document = {
            ...createDocument(),
            version: "latest",
        };

        expect(
            validator.validate(document).valid,
        ).toBe(false);
    });

    it("throws when document is invalid", () => {
        expect(() => {
            validator.validateOrThrow({
                schemaVersion: "1.0",
            });
        }).toThrow("Invalid email document");
    });

    it("accepts a nested component tree", () => {
        const document = createDocument();

        document.body.push({
            id: "main-container",
            type: "container",
            children: [
                {
                    id: "nested-section",
                    type: "section",
                    children: [
                        {
                            id: "nested-text",
                            type: "text",
                            props: {
                                text: "Nested content",
                            },
                        },
                    ],
                },
            ],
        });

        expect(
            validator.validate(document).valid,
        ).toBe(true);
    });
});
