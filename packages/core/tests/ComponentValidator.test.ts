import {
    describe,
    expect,
    it,
} from "vitest";

import {
    ComponentRegistry,
    ComponentValidator,
    type EmailDocument,
} from "../src/index.js";

const registry = new ComponentRegistry();

const validator =
    new ComponentValidator(registry);

function createDocument(): EmailDocument {
    return {
        schemaVersion: "1.0",
        id: "welcome",
        version: "1.0.0",
        subject: "Welcome",

        header: {
            id: "header",
            type: "header",
        },

        body: [
            {
                id: "heading",
                type: "heading",
                props: {
                    text: "Hello!",
                },
            },
            {
                id: "button",
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
                text: "© 2026 Example",
            },
        },
    };
}

describe("ComponentValidator", () => {
    it("validates a complete document", () => {
        const result = validator.validate(
            createDocument(),
        );

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it("rejects unknown components", () => {
        const document = createDocument();

        document.body.push({
            id: "unknown",
            type: "missing-component",
        });

        const result = validator.validate(document);

        expect(result.valid).toBe(false);

        expect(
            result.errors.some(
                (error) =>
                    error.message.includes(
                        "Unknown component",
                    ),
            ),
        ).toBe(true);
    });

    it("rejects invalid button properties", () => {
        const document = createDocument();

        document.body.push({
            id: "broken-button",
            type: "button",
            props: {
                text: "Invalid button",
            },
        });

        expect(
            validator.validate(document).valid,
        ).toBe(false);
    });

    it("rejects button URLs containing credentials", () => {
        const document = createDocument();

        document.body[1]!.props = {
            text: "Invalid button",
            href: "https://user:password@example.com",
        };

        expect(validator.validate(document).valid).toBe(false);
    });

    it("rejects children in leaf components", () => {
        const document = createDocument();

        document.body.push({
            id: "parent-heading",
            type: "heading",
            props: {
                text: "Heading",
            },
            children: [
                {
                    id: "child",
                    type: "text",
                    props: {
                        text: "Child",
                    },
                },
            ],
        });

        const result = validator.validate(document);

        expect(result.valid).toBe(false);
    });

    it("accepts nested layout components", () => {
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
                                text: "Hello inside section",
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

    it("accepts custom data attributes", () => {
        const document = createDocument();

        document.body.push({
            id: "tracking-label",
            type: "text",
            props: {
                text: "Tracking",
            },
            attrs: {
                "data-campaign": "welcome",
                "data-component": "tracking-label",
            },
        });

        expect(
            validator.validate(document).valid,
        ).toBe(true);
    });

    it("throws for invalid components", () => {
        const document = createDocument();

        document.body.push({
            id: "invalid",
            type: "not-registered",
        });

        expect(() => {
            validator.validateOrThrow(document);
        }).toThrow("Component validation failed");
    });

    it("accepts an empty container", () => {
        const document = createDocument();

        document.body.push({
            id: "empty-container",
            type: "container",
            children: [],
        });

        expect(
            validator.validate(document).valid,
        ).toBe(true);
    });
});
