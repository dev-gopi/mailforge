
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
    COMPOSITE_COMPONENT_NAMES,
    registerCompositeComponents,
    formatMoney,
} from "../src/index.js";

function setup() {
    const registry = new ComponentRegistry();
    const catalog = new ComponentCatalog(registry);

    registerCompositeComponents(catalog);

    const expander = new ComponentExpander(
        registry,
        catalog,
    );

    return { catalog, expander };
}

function expand(
    node: EmailNode,
): EmailNode[] {
    const { expander } = setup();

    const document: EmailDocument = {
        schemaVersion: "1.0",
        id: "composite-test",
        version: "1.0.0",
        subject: "Composite",
        body: [node],
    };

    return expander.expand(document).body;
}

describe("MailForge Composite Components", () => {
    it("1. registers six composite components", () => {
        const { catalog } = setup();

        expect(COMPOSITE_COMPONENT_NAMES)
            .toHaveLength(6);

        for (const name of COMPOSITE_COMPONENT_NAMES) {
            expect(catalog.has(name)).toBe(true);
        }
    });

    it("2. creates a valid ContentCard section", () => {
        const output = expand({
            id: "card",
            type: "mf-content-card",
            props: {
                title: "Welcome",
                description: "Your account is ready",
            },
        });

        expect(output).toHaveLength(1);
        expect(output[0]?.type).toBe("section");
        expect(output[0]?.children?.[0]?.type)
            .toBe("column");

        expect(
            output[0]?.children?.[0]?.children?.length,
        ).toBe(2);
    });

    it("3. creates multiple buttons with stable IDs", () => {
        const output = expand({
            id: "actions",
            type: "mf-button-group",
            props: {
                items: [
                    {
                        label: "Approve",
                        href: "https://example.com/approve",
                    },
                    {
                        label: "Details",
                        href: "https://example.com/details",
                        variant: "secondary",
                    },
                ],
            },
        });

        expect(output.map(node => node.id)).toEqual([
            "actions--0",
            "actions--1",
        ]);

        expect(output.every(node => node.type === "button"))
            .toBe(true);
    });

    it("4. calculates a discounted price summary", () => {
        const output = expand({
            id: "price",
            type: "mf-price-summary",
            props: {
                currency: "USD",
                subtotalCents: 4000,
                shippingCents: 500,
                discountCents: 200,
            },
        });

        expect(output.some(
            node => node.props?.text === "Total — USD 43.00",
        )).toBe(true);

        expect(output.some(
            node => node.props?.text === "Discount — USD 2.00",
        )).toBe(true);
    });

    it("5. formats OrderItem quantity and amount", () => {
        const output = expand({
            id: "item",
            type: "mf-order-item",
            props: {
                name: "Notebook",
                quantity: 2,
                unitPriceCents: 2000,
                currency: "USD",
            },
        });

        expect(output[0]?.props?.text)
            .toBe("Notebook × 2 — USD 40.00");
    });

    it("6. calculates a complete OrderSummary", () => {
        const output = expand({
            id: "order",
            type: "mf-order-summary",
            props: {
                orderId: "1042",
                currency: "USD",
                items: [
                    {
                        name: "Notebook",
                        quantity: 2,
                        unitPriceCents: 2000,
                    },
                    {
                        name: "Pen",
                        quantity: 1,
                        unitPriceCents: 300,
                    },
                ],
                shippingCents: 500,
                discountCents: 200,
            },
        });

        expect(output[0]?.props?.text)
            .toBe("Order #1042");

        expect(output.at(-1)?.props?.text)
            .toBe("Total — USD 46.00");
    });

    it("7. creates a valid two-column layout", () => {
        const output = expand({
            id: "columns",
            type: "mf-two-column",
            props: {
                leftTitle: "Feature A",
                leftText: "First feature",
                rightTitle: "Feature B",
                rightText: "Second feature",
            },
        });

        const section = output[0]!;

        expect(section.type).toBe("section");
        expect(section.children).toHaveLength(2);

        expect(section.children?.[0]?.type)
            .toBe("column");

        expect(section.children?.[1]?.type)
            .toBe("column");
    });

    it("8. rejects unsafe ButtonGroup URLs", () => {
        expect(() => expand({
            id: "actions",
            type: "mf-button-group",
            props: {
                items: [
                    {
                        label: "Unsafe",
                        href: "javascript:alert(1)",
                    },
                ],
            },
        })).toThrow("Invalid props");
    });

    it("9. rejects discounts exceeding charges", () => {
        expect(() => expand({
            id: "price",
            type: "mf-price-summary",
            props: {
                subtotalCents: 100,
                shippingCents: 0,
                discountCents: 500,
            },
        })).toThrow("Invalid order total");
    });

    it("10. rejects negative monetary amounts", () => {
        expect(() => expand({
            id: "price",
            type: "mf-price-summary",
            props: {
                subtotalCents: -500,
            },
        })).toThrow("Invalid props");
    });

    it("11. rejects unsupported currency values", () => {
        expect(() => expand({
            id: "item",
            type: "mf-order-item",
            props: {
                name: "Item",
                quantity: 1,
                unitPriceCents: 500,
                currency: "INVALID",
            },
        })).toThrow("Invalid props");
    });

    it("12. formats integer minor units correctly", () => {
        expect(formatMoney("USD", 1001))
            .toBe("USD 10.01");

        expect(formatMoney("INR", 99))
            .toBe("INR 0.99");

        expect(formatMoney("EUR", 0))
            .toBe("EUR 0.00");
    });
});
