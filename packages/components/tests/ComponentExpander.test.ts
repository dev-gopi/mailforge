
import {
    describe,
    expect,
    it,
} from "vitest";

import { z } from "zod";

import {
    ComponentRegistry,
    type EmailDocument,
    type EmailNode,
} from "@mailforge/core";

import {
    ComponentCatalog,
    ComponentExpander,
    ComponentRenderError,
    type ReusableComponentDefinition,
} from "../src/index.js";

function template(
    node: EmailNode = {
        id: "status",
        type: "status-badge",
        props: {
            label: "Payment received",
        },
    },
): EmailDocument {
    return {
        schemaVersion: "1.0",
        id: "receipt",
        version: "1.0.0",
        subject: "Payment receipt",
        body: [node],
    };
}

function definition(): ReusableComponentDefinition {
    return {
        name: "status-badge",
        version: "1.0.0",
        allowChildren: false,

        schema: z.object({
            label: z.string().min(1),
            status: z.enum(["success", "warning"]),
        }),

        defaults: {
            status: "success",
        },

        render: (props, context) => ({
            id: context.nodeId,
            type: "text",
            props: {
                text: String(props.label),
            },
            styles: {
                color: props.status === "success"
                    ? "#15803d"
                    : "#a16207",
            },
        }),
    };
}

function setup(
    custom = definition(),
) {
    const registry = new ComponentRegistry();
    const catalog = new ComponentCatalog(registry);

    catalog.register(custom);

    const expander = new ComponentExpander(
        registry,
        catalog,
    );

    return { registry, catalog, expander };
}

describe("MailForge ComponentExpander", () => {
    it("1. expands custom components into primitives", () => {
        const { expander } = setup();

        const output = expander.expand(template());

        expect(output.body[0]?.type).toBe("text");
        expect(output.body[0]?.id).toBe("status");
        expect(output.body[0]?.props?.text)
            .toBe("Payment received");
    });

    it("2. provides resolved default properties", () => {
        const { expander } = setup();

        const output = expander.expand(template());

        expect(output.body[0]?.styles?.color)
            .toBe("#15803d");
    });

    it("3. preserves original style and attributes", () => {
        const { expander } = setup();

        const input = template({
            id: "status",
            type: "status-badge",
            props: {
                label: "Approved",
            },
            styles: {
                color: "#123456",
            },
            attrs: {
                "data-status": "approved",
            },
        });

        const output = expander.expand(input);

        expect(output.body[0]?.styles?.color)
            .toBe("#123456");

        expect(output.body[0]?.attrs?.["data-status"])
            .toBe("approved");
    });

    it("4. expands nodes inside sections", () => {
        const { expander } = setup();

        const input = template({
            id: "section",
            type: "section",
            children: [
                {
                    id: "status",
                    type: "status-badge",
                    props: {
                        label: "Paid",
                    },
                },
            ],
        });

        const output = expander.expand(input);

        expect(output.body[0]?.children?.[0]?.type)
            .toBe("text");
    });

    it("5. does not mutate original documents", () => {
        const { expander } = setup();

        const input = template();
        const snapshot = structuredClone(input);

        expander.expand(input);

        expect(input).toEqual(snapshot);
    });

    it("6. rejects invalid custom properties", () => {
        const { expander } = setup();

        const input = template({
            id: "status",
            type: "status-badge",
            props: {
                label: "",
            },
        });

        expect(() => expander.expand(input))
            .toThrow("Invalid props");
    });

    it("7. rejects children on custom leaf nodes", () => {
        const { expander } = setup();

        const input = template({
            id: "status",
            type: "status-badge",
            props: {
                label: "Paid",
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

        expect(() => expander.expand(input))
            .toThrow("does not allow children");
    });

    it("8. rejects unsafe output URLs", () => {
        const custom = definition();

        custom.render = (_props, context) => ({
            id: context.nodeId,
            type: "button",
            props: {
                text: "Open",
                href: "javascript:alert(1)",
            },
        });

        const { expander } = setup(custom);

        expect(() => expander.expand(template()))
            .toThrow("Invalid props");
    });

    it("9. rejects unsafe output attributes", () => {
        const custom = definition();

        custom.render = (_props, context) => ({
            id: context.nodeId,
            type: "text",
            props: {
                text: "Approved",
            },
            attrs: {
                onclick: "alert(1)",
            },
        });

        const { expander } = setup(custom);

        expect(() => expander.expand(template()))
            .toThrow("Unsafe attribute");
    });

    it("10. expands multiple output nodes", () => {
        const custom = definition();

        custom.render = (_props, context) => [
            {
                id: context.nodeId,
                type: "text",
                props: { text: "First" },
            },
            {
                id: `${context.nodeId}-second`,
                type: "text",
                props: { text: "Second" },
            },
        ];

        const { expander } = setup(custom);

        const expanded = expander.expand(template());

        expect(expanded.body).toHaveLength(2);
        expect(expanded.body.map((node) => node.props?.text))
            .toEqual(["First", "Second"]);
    });

    it("11. rejects altered node IDs", () => {
        const custom = definition();

        custom.render = () => ({
            id: "wrong-id",
            type: "text",
            props: { text: "Wrong" },
        });

        const { expander } = setup(custom);

        expect(() => expander.expand(template()))
            .toThrow("preserve context.nodeId");
    });

    it("12. expands layout output types", () => {
        const custom = definition();

        custom.render = (_props, context) => ({
            id: context.nodeId,
            type: "section",
        });

        const { expander } = setup(custom);

        const expanded = expander.expand(template());

        expect(expanded.body[0]?.type).toBe("section");
    });

    it("13. wraps handler exceptions", () => {
        const custom = definition();

        custom.render = () => {
            throw new Error("Handler failed internally");
        };

        const { expander } = setup(custom);

        expect(() => expander.expand(template()))
            .toThrow(ComponentRenderError);
    });

    it("14. rejects invalid handler results", () => {
        const custom = definition();

        custom.render = () =>
            null as unknown as EmailNode;

        const { expander } = setup(custom);

        expect(() => expander.expand(template()))
            .toThrow("Handler output must contain EmailNode objects");
    });

    it("15. limits total custom expansions", () => {
        const { expander } = setup();

        const input = template();

        input.body = Array.from(
            { length: 251 },
            (_, index) => ({
                id: `status-${index}`,
                type: "status-badge",
                props: {
                    label: "Paid",
                },
            }),
        );

        expect(() => expander.expand(input))
            .toThrow("Too many custom components");
    });

    it("16. supplies immutable handler properties", () => {
        const custom = definition();

        custom.render = (props, context) => {
            // Deliberately attempt to mutate a
            // frozen handler input.
            Object.assign(props, {
                label: "Changed",
            });

            return {
                id: context.nodeId,
                type: "text",
                props: {
                    text: "Should not render",
                },
            };
        };

        const { expander } = setup(custom);

        expect(() => expander.expand(template()))
            .toThrow(ComponentRenderError);
    });
});
