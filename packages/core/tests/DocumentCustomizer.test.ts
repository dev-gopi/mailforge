
import {
    describe,
    expect,
    it,
} from "vitest";

import {
    DocumentCustomizer,
    type EmailDocument,
    type DocumentPatch,
} from "../src/index.js";

function createDocument(): EmailDocument {
    return {
        schemaVersion: "1.0",
        id: "welcome",
        version: "1.0.0",
        subject: "Welcome to MailForge",

        header: {
            id: "company-header",
            type: "header",
            children: [
                {
                    id: "company-name",
                    type: "heading",
                    props: {
                        text: "MailForge",
                    },
                },
            ],
        },

        body: [
            {
                id: "welcome-title",
                type: "heading",
                props: {
                    text: "Welcome!",
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
            id: "company-footer",
            type: "footer",
            children: [],
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

describe("DocumentCustomizer", () => {
    const customizer = new DocumentCustomizer();

    it("updates copyright text", () => {
        const result = customizer.apply(
            createDocument(),
            [
                {
                    op: "update",
                    target: "copyright",
                    props: {
                        text: "© 2026 Acme Technologies",
                    },
                },
            ],
        );

        expect(result.copyright?.props?.text)
            .toBe("© 2026 Acme Technologies");
    });

    it("updates styles and custom attributes", () => {
        const result = customizer.apply(
            createDocument(),
            [
                {
                    op: "update",
                    target: "welcome-title",
                    styles: {
                        color: "#2563eb",
                        fontSize: 28,
                    },
                    attrs: {
                        "data-template": "welcome",
                        "data-company": "acme",
                        "aria-label": "Welcome heading",
                    },
                },
            ],
        );

        expect(result.body[0]?.styles?.color)
            .toBe("#2563eb");

        expect(result.body[0]?.attrs?.["data-company"])
            .toBe("acme");
    });

    it("replaces the complete header", () => {
        const result = customizer.apply(
            createDocument(),
            [
                {
                    op: "replace",
                    target: "company-header",
                    node: {
                        id: "new-header",
                        type: "header",
                        children: [
                            {
                                id: "new-logo-title",
                                type: "heading",
                                props: {
                                    text: "Acme Technologies",
                                },
                            },
                        ],
                    },
                },
            ],
        );

        expect(result.header?.id).toBe("new-header");
        expect(result.header?.children?.[0]?.props?.text)
            .toBe("Acme Technologies");
    });

    it("removes the optional footer", () => {
        const result = customizer.apply(
            createDocument(),
            [
                {
                    op: "remove",
                    target: "company-footer",
                },
            ],
        );

        expect(result.footer).toBeUndefined();
    });

    it("inserts a component before a button", () => {
        const result = customizer.apply(
            createDocument(),
            [
                {
                    op: "insertBefore",
                    target: "welcome-button",
                    node: {
                        id: "security-notice",
                        type: "text",
                        props: {
                            text: "Your account is ready.",
                        },
                    },
                },
            ],
        );

        expect(result.body.map((node) => node.id))
            .toEqual([
                "welcome-title",
                "security-notice",
                "welcome-button",
            ]);
    });

    it("inserts a component after a heading", () => {
        const result = customizer.apply(
            createDocument(),
            [
                {
                    op: "insertAfter",
                    target: "welcome-title",
                    node: {
                        id: "welcome-message",
                        type: "text",
                        props: {
                            text: "Thank you for joining.",
                        },
                    },
                },
            ],
        );

        expect(result.body[1]?.id)
            .toBe("welcome-message");
    });

    it("inserts components into a body slot", () => {
        const result = customizer.apply(
            createDocument(),
            [
                {
                    op: "slot",
                    slot: "body.start",
                    nodes: [
                        {
                            id: "announcement",
                            type: "text",
                            props: {
                                text: "Important announcement",
                            },
                        },
                    ],
                },
            ],
        );

        expect(result.body[0]?.id)
            .toBe("announcement");
    });

    it("inserts reusable content into footer slot", () => {
        const result = customizer.apply(
            createDocument(),
            [
                {
                    op: "slot",
                    slot: "footer.end",
                    nodes: [
                        {
                            id: "support-contact",
                            type: "text",
                            props: {
                                text: "support@example.com",
                            },
                        },
                    ],
                },
            ],
        );

        expect(result.footer?.children?.[0]?.id)
            .toBe("support-contact");
    });

    it("does not mutate the original document", () => {
        const original = createDocument();

        const result = customizer.apply(
            original,
            [
                {
                    op: "update",
                    target: "copyright",
                    props: {
                        text: "Updated copyright",
                    },
                },
            ],
        );

        expect(original.copyright?.props?.text)
            .toBe("© 2026 MailForge");

        expect(result.copyright?.props?.text)
            .toBe("Updated copyright");
    });

    it("rejects the entire batch if a patch fails", () => {
        const original = createDocument();

        const patches: DocumentPatch[] = [
            {
                op: "update",
                target: "copyright",
                props: {
                    text: "Temporary change",
                },
            },
            {
                op: "remove",
                target: "missing-component",
            },
        ];

        expect(() => {
            customizer.apply(original, patches);
        }).toThrow("Component not found");

        expect(original.copyright?.props?.text)
            .toBe("© 2026 MailForge");
    });

    it("rejects duplicate IDs introduced by patches", () => {
        const original = createDocument();

        expect(() => {
            customizer.apply(original, [
                {
                    op: "insertAfter",
                    target: "welcome-title",
                    node: {
                        id: "welcome-button",
                        type: "text",
                        props: {
                            text: "Duplicate ID",
                        },
                    },
                },
            ]);
        }).toThrow("Duplicate node ID");

        expect(original.body).toHaveLength(2);
    });

    it("rejects unsafe attributes introduced by patches", () => {
        const original = createDocument();

        expect(() => {
            customizer.apply(original, [
                {
                    op: "update",
                    target: "welcome-title",
                    attrs: {
                        onclick: "alert(1)",
                    },
                },
            ]);
        }).toThrow("Unsafe attribute");

        expect(original.body[0]?.attrs)
            .toBeUndefined();
    });
});
