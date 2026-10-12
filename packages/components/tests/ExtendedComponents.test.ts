import {
    describe,
    expect,
    it,
} from "vitest";

import {
    ComponentRegistry,
    type EmailDocument,
    type EmailNode,
} from "@mailforge/core";

import {
    ComponentCatalog,
    ComponentExpander,
    EXTENDED_COMPONENT_NAMES,
    registerExtendedComponents,
    registerAllComponents,
    STANDARD_COMPONENT_NAMES,
    COMPOSITE_COMPONENT_NAMES,
} from "../src/index.js";

function setup() {
    const registry = new ComponentRegistry();
    const catalog = new ComponentCatalog(registry);

    registerExtendedComponents(catalog);

    const expander = new ComponentExpander(
        registry,
        catalog,
    );

    return { registry, catalog, expander };
}

function expand(node: EmailNode): EmailNode[] {
    const { expander } = setup();

    const document: EmailDocument = {
        schemaVersion: "1.0",
        id: "extended-test",
        version: "1.0.0",
        subject: "Extended Component Test",
        body: [node],
    };

    return expander.expand(document).body;
}

describe("MailForge Extended Components", () => {
    it("1. registers all extended components", () => {
        const { catalog } = setup();

        expect(EXTENDED_COMPONENT_NAMES).toHaveLength(4);

        for (const name of EXTENDED_COMPONENT_NAMES) {
            expect(catalog.has(name)).toBe(true);
        }
    });

    it("2. expands a CalloutBox component with all variants", () => {
        const output = expand({
            id: "callout-1",
            type: "mf-callout-box",
            props: {
                title: "Important Notice",
                message: "Please verify your email address to continue.",
                variant: "warning",
            },
        });

        expect(output).toHaveLength(1);
        expect(output[0]?.type).toBe("section");
        expect(output[0]?.styles?.backgroundColor).toBe("#fffbeb");

        const column = output[0]?.children?.[0];
        expect(column?.type).toBe("column");
        expect(column?.children).toHaveLength(2);

        expect(column?.children?.[0]?.type).toBe("heading");
        expect(column?.children?.[0]?.props?.text).toBe("Important Notice");

        expect(column?.children?.[1]?.type).toBe("text");
        expect(column?.children?.[1]?.props?.text).toBe(
            "Please verify your email address to continue.",
        );
    });

    it("3. expands a CalloutBox with default variant and no title", () => {
        const output = expand({
            id: "callout-default",
            type: "mf-callout-box",
            props: {
                message: "Here is some helpful information.",
            },
        });

        const column = output[0]?.children?.[0];
        expect(column?.children).toHaveLength(1);
        expect(column?.children?.[0]?.props?.text).toBe(
            "Here is some helpful information.",
        );
    });

    it("4. expands a KeyValueList component", () => {
        const output = expand({
            id: "kv-1",
            type: "mf-key-value-list",
            props: {
                title: "Shipping Details",
                items: [
                    { key: "Carrier", value: "DHL Express" },
                    { key: "Tracking #", value: "DHL-987654321" },
                    { key: "Est. Delivery", value: "Oct 15, 2026" },
                ],
            },
        });

        expect(output).toHaveLength(1);
        const column = output[0]?.children?.[0];
        expect(column?.children).toHaveLength(4); // title + 3 items

        expect(column?.children?.[0]?.type).toBe("heading");
        expect(column?.children?.[0]?.props?.text).toBe("Shipping Details");

        expect(column?.children?.[1]?.props?.text).toBe("Carrier: DHL Express");
        expect(column?.children?.[2]?.props?.text).toBe("Tracking #: DHL-987654321");
        expect(column?.children?.[3]?.props?.text).toBe("Est. Delivery: Oct 15, 2026");
    });

    it("5. expands a DividerWithText component", () => {
        const output = expand({
            id: "div-1",
            type: "mf-divider-with-text",
            props: {
                text: "OR SIGN IN WITH",
            },
        });

        expect(output).toHaveLength(1);
        const column = output[0]?.children?.[0];
        expect(column?.children).toHaveLength(3); // divider, text, divider

        expect(column?.children?.[0]?.type).toBe("divider");
        expect(column?.children?.[1]?.type).toBe("text");
        expect(column?.children?.[1]?.props?.text).toBe("OR SIGN IN WITH");
        expect(column?.children?.[2]?.type).toBe("divider");
    });

    it("6. expands a SocialLinks component with safe HTTPS links", () => {
        const output = expand({
            id: "social-1",
            type: "mf-social-links",
            props: {
                links: [
                    {
                        platform: "github",
                        url: "https://github.com/mailforge",
                        label: "Source Code",
                    },
                    {
                        platform: "twitter",
                        url: "https://twitter.com/mailforge",
                    },
                ],
            },
        });

        expect(output).toHaveLength(1);
        const column = output[0]?.children?.[0];
        expect(column?.children).toHaveLength(2);

        expect(column?.children?.[0]?.type).toBe("button");
        expect(column?.children?.[0]?.props?.text).toBe("Source Code");
        expect(column?.children?.[0]?.props?.href).toBe("https://github.com/mailforge");

        expect(column?.children?.[1]?.type).toBe("button");
        expect(column?.children?.[1]?.props?.text).toBe("Twitter");
        expect(column?.children?.[1]?.props?.href).toBe("https://twitter.com/mailforge");
    });

    it("7. rejects unsafe HTTP URLs in SocialLinks", () => {
        expect(() => {
            expand({
                id: "social-insecure",
                type: "mf-social-links",
                props: {
                    links: [
                        {
                            platform: "website",
                            url: "http://insecure.example.com",
                        },
                    ],
                },
            });
        }).toThrow(/HTTPS/);
    });

    it("8. registerAllComponents registers standard, composite, and extended components together", () => {
        const registry = new ComponentRegistry();
        const catalog = new ComponentCatalog(registry);

        registerAllComponents(catalog);

        for (const name of STANDARD_COMPONENT_NAMES) {
            expect(catalog.has(name)).toBe(true);
        }
        for (const name of COMPOSITE_COMPONENT_NAMES) {
            expect(catalog.has(name)).toBe(true);
        }
        for (const name of EXTENDED_COMPONENT_NAMES) {
            expect(catalog.has(name)).toBe(true);
        }

        expect(catalog.list().length).toBe(
            STANDARD_COMPONENT_NAMES.length +
            COMPOSITE_COMPONENT_NAMES.length +
            EXTENDED_COMPONENT_NAMES.length,
        );
    });
});
