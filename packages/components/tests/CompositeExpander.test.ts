
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
    type ComponentRenderHandler,
} from "../src/index.js";

function document(
    ...nodes: EmailNode[]
): EmailDocument {
    return {
        schemaVersion: "1.0",
        id: "expansion-test",
        version: "1.0.0",
        subject: "Composite expansion",
        body: nodes,
    };
}

function setup() {
    const registry = new ComponentRegistry();
    const catalog = new ComponentCatalog(registry);
    const expander = new ComponentExpander(
        registry,
        catalog,
    );

    const register = (
        name: string,
        render: ComponentRenderHandler,
    ) => {
        catalog.register({
            name,
            version: "1.0.0",
            allowChildren: false,
            schema: z.object({}).strict(),
            render,
        });
    };

    return { registry, catalog, expander, register };
}

const textNode = (
    id: string,
    text: string,
): EmailNode => ({
    id,
    type: "text",
    props: { text },
});

describe("Composite Component Expansion", () => {
    it("1. preserves old single-node output IDs", () => {
        const { register, expander } = setup();

        register("mf-test-single", (_props, ctx) =>
            textNode(ctx.nodeId, "Hello"),
        );

        const result = expander.expand(document({
            id: "original",
            type: "mf-test-single",
        }));

        expect(result.body[0]?.id).toBe("original");
        expect(result.body[0]?.type).toBe("text");
    });

    it("2. generates deterministic multi-node IDs", () => {
        const { register, expander } = setup();

        register("mf-test-multi", (_props, ctx) => [
            textNode(`${ctx.nodeId}-a`, "First"),
            textNode(`${ctx.nodeId}-b`, "Second"),
        ]);

        const source = document({
            id: "actions",
            type: "mf-test-multi",
        });

        const first = expander.expand(source);
        const second = expander.expand(source);

        expect(first).toEqual(second);

        expect(first.body.map(node => node.id))
            .toEqual(["actions--0", "actions--1"]);
    });

    it("3. generates deterministic child IDs", () => {
        const { register, expander } = setup();

        register("mf-test-section", (_props, ctx) => ({
            id: ctx.nodeId,
            type: "section",
            children: [
                {
                    id: "handler-column",
                    type: "column",
                    children: [
                        textNode("handler-text", "Hello"),
                    ],
                },
            ],
        }));

        const result = expander.expand(document({
            id: "card",
            type: "mf-test-section",
        }));

        const section = result.body[0]!;
        const column = section.children?.[0];
        const text = column?.children?.[0];

        expect(section.id).toBe("card");
        expect(column?.id).toBe("card--0");
        expect(text?.id).toBe("card--0--0");
    });

    it("4. detects direct component cycles", () => {
        const { register, expander } = setup();

        register("mf-test-cycle", (_props, ctx) => ({
            id: ctx.nodeId,
            type: "mf-test-cycle",
        }));

        expect(() => expander.expand(document({
            id: "cycle",
            type: "mf-test-cycle",
        }))).toThrow("Component expansion cycle");
    });

    it("5. detects indirect component cycles", () => {
        const { register, expander } = setup();

        register("mf-test-alpha", (_props, ctx) => ({
            id: ctx.nodeId,
            type: "mf-test-beta",
        }));

        register("mf-test-beta", (_props, ctx) => ({
            id: ctx.nodeId,
            type: "mf-test-alpha",
        }));

        expect(() => expander.expand(document({
            id: "cycle",
            type: "mf-test-alpha",
        }))).toThrow("mf-test-alpha -> mf-test-beta");
    });

    it("6. supports valid custom-component chains", () => {
        const { register, expander } = setup();

        register("mf-test-first", (_props, ctx) => ({
            id: ctx.nodeId,
            type: "mf-test-second",
        }));

        register("mf-test-second", (_props, ctx) =>
            textNode(ctx.nodeId, "Finished"),
        );

        const result = expander.expand(document({
            id: "chain",
            type: "mf-test-first",
        }));

        expect(result.body[0]?.props?.text)
            .toBe("Finished");
    });

    it("7. rejects empty output arrays", () => {
        const { register, expander } = setup();

        register("mf-test-empty", () => []);

        expect(() => expander.expand(document({
            id: "empty",
            type: "mf-test-empty",
        }))).toThrow("no output nodes");
    });

    it("8. preserves single-node ID enforcement", () => {
        const { register, expander } = setup();

        register("mf-test-wrong-id", () =>
            textNode("incorrect", "Hello"),
        );

        expect(() => expander.expand(document({
            id: "correct",
            type: "mf-test-wrong-id",
        }))).toThrow("preserve context.nodeId");
    });

    it("9. rejects expanded ID collisions", () => {
        const { register, expander } = setup();

        register("mf-test-multi", (_props, ctx) => [
            textNode(`${ctx.nodeId}-a`, "A"),
            textNode(`${ctx.nodeId}-b`, "B"),
        ]);

        expect(() => expander.expand(document(
            {
                id: "actions",
                type: "mf-test-multi",
            },
            textNode("actions--0", "Existing"),
        ))).toThrow("Duplicate node ID");
    });

    it("10. rejects excessive component executions", () => {
        const { register, expander } = setup();

        register("mf-test-many", (_props, ctx) =>
            textNode(ctx.nodeId, "Hello"),
        );

        const nodes = Array.from(
            { length: 251 },
            (_, index): EmailNode => ({
                id: `item-${index}`,
                type: "mf-test-many",
            }),
        );

        expect(() =>
            expander.expand(document(...nodes)),
        ).toThrow("Too many custom components");
    });

    it("11. rejects more than 1000 expanded nodes", () => {
        const { register, expander } = setup();

        register("mf-test-huge", (_props, ctx) =>
            Array.from(
                { length: 1001 },
                (_, index) =>
                    textNode(`${ctx.nodeId}-${index}`, "Hello"),
            ),
        );

        expect(() => expander.expand(document({
            id: "huge",
            type: "mf-test-huge",
        }))).toThrow("Handler output exceeds array item budget");
    });

    it("12. rejects deeply nested output trees", () => {
        const { register, expander } = setup();

        register("mf-test-deep", (_props, ctx) => {
            let node: EmailNode =
                textNode("leaf", "Deep");

            for (let index = 0; index < 25; index++) {
                node = {
                    id: `nested-${index}`,
                    type: "container",
                    children: [node],
                };
            }

            return {
                ...node,
                id: ctx.nodeId,
            };
        });

        expect(() => expander.expand(document({
            id: "deep",
            type: "mf-test-deep",
        }))).toThrow("Handler output exceeds nesting budget");
    });

    it("13. rejects invalid section nesting", () => {
        const { register, expander } = setup();

        register("mf-test-section", (_props, ctx) => ({
            id: ctx.nodeId,
            type: "section",
            children: [
                {
                    id: "column",
                    type: "column",
                    children: [
                        textNode("text", "Hello"),
                    ],
                },
            ],
        }));

        const source = document({
            id: "outer-section",
            type: "section",
            children: [
                {
                    id: "outer-column",
                    type: "column",
                    children: [
                        {
                            id: "nested",
                            type: "mf-test-section",
                        },
                    ],
                },
            ],
        });

        expect(() => expander.expand(source))
            .toThrow("not valid inside an MJML column");
    });

    it("14. rejects unsafe primitive output", () => {
        const { register, expander } = setup();

        register("mf-test-unsafe", (_props, ctx) => ({
            id: ctx.nodeId,
            type: "button",
            props: {
                text: "Open",
                href: "javascript:alert(1)",
            },
        }));

        expect(() => expander.expand(document({
            id: "unsafe",
            type: "mf-test-unsafe",
        }))).toThrow("Invalid props");
    });

    it("15. preserves input and first-node overrides", () => {
        const { register, expander } = setup();

        register("mf-test-multi", (_props, ctx) => [
            {
                ...textNode(`${ctx.nodeId}-a`, "A"),
                styles: { color: "#000000" },
            },
            textNode(`${ctx.nodeId}-b`, "B"),
        ]);

        const source = document({
            id: "group",
            type: "mf-test-multi",
            styles: {
                color: "#123456",
            },
            attrs: {
                "data-group": "yes",
            },
        });

        const snapshot = structuredClone(source);
        const result = expander.expand(source);

        expect(source).toEqual(snapshot);
        expect(result.body[0]?.styles?.color)
            .toBe("#123456");
        expect(result.body[0]?.attrs?.["data-group"])
            .toBe("yes");
        expect(result.body[1]?.attrs)
            .toBeUndefined();
    });
});
