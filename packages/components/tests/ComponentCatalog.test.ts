
import {
    describe,
    expect,
    it,
} from "vitest";

import { z } from "zod";

import {
    ComponentRegistry,
} from "@mailforge/core";

import {
    ComponentCatalog,
    ComponentCatalogError,
    type ReusableComponentDefinition,
} from "../src/index.js";

function definition(
    name = "status-badge",
): ReusableComponentDefinition {
    return {
        name,
        version: "1.0.0",
        description: "Reusable status badge",
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
        }),
    };
}

describe("MailForge ComponentCatalog", () => {
    it("1. starts empty while core keeps its built-ins", () => {
        const registry = new ComponentRegistry();
        const catalog = new ComponentCatalog(registry);

        expect(catalog.list()).toEqual([]);
        expect(catalog.has("text")).toBe(false);
        expect(registry.has("text")).toBe(true);
    });

    it("2. registers in the shared core registry", () => {
        const registry = new ComponentRegistry();
        const catalog = new ComponentCatalog(registry);

        expect(catalog.register(definition()))
            .toBe(catalog);

        expect(catalog.has("status-badge")).toBe(true);
        expect(registry.has("status-badge")).toBe(true);
    });

    it("3. lists custom components alphabetically", () => {
        const catalog = new ComponentCatalog();

        catalog.register(definition("warning-badge"));
        catalog.register(definition("status-badge"));

        expect(
            catalog.list().map((item) => item.name),
        ).toEqual([
            "status-badge",
            "warning-badge",
        ]);
    });

    it("4. returns component metadata and handler", () => {
        const catalog = new ComponentCatalog();

        catalog.register(definition());

        const item = catalog.get("status-badge");

        expect(item?.version).toBe("1.0.0");
        expect(item?.description)
            .toBe("Reusable status badge");
        expect(typeof item?.render).toBe("function");
    });

    it("5. merges defaults through core", () => {
        const catalog = new ComponentCatalog();

        catalog.register(definition());

        const props = catalog.resolveProps(
            "status-badge",
            { label: "Paid" },
        );

        expect(props).toEqual({
            label: "Paid",
            status: "success",
        });
    });

    it("6. validates supplied component properties", () => {
        const catalog = new ComponentCatalog();

        catalog.register(definition());

        expect(() => {
            catalog.resolveProps(
                "status-badge",
                { label: "" },
            );
        }).toThrow("Invalid props");
    });

    it("7. rejects duplicate custom components", () => {
        const catalog = new ComponentCatalog();

        catalog.register(definition());

        expect(() => {
            catalog.register(definition());
        }).toThrow(ComponentCatalogError);

        expect(catalog.list()).toHaveLength(1);
    });

    it("8. prevents overriding core built-ins", () => {
        const catalog = new ComponentCatalog();

        expect(() => {
            catalog.register(definition("text"));
        }).toThrow(ComponentCatalogError);
    });

    it("9. replaces a reusable component atomically", () => {
        const catalog = new ComponentCatalog();
        catalog.register(definition());

        catalog.replace({
            ...definition(),
            version: "2.0.0",
            render: (props, context) => ({
                id: context.nodeId,
                type: "text",
                props: { text: `Updated: ${String(props.label)}` },
            }),
        });

        expect(catalog.get("status-badge")?.version).toBe("2.0.0");
        expect(catalog.get("status-badge")?.render(
            { label: "Paid", status: "success" },
            { nodeId: "status", componentName: "status-badge" },
        )).toMatchObject({
            props: { text: "Updated: Paid" },
        });
    });

    it("10. unregisters only reusable components", () => {
        const catalog = new ComponentCatalog();
        catalog.register(definition());

        expect(catalog.unregister("status-badge")).toBe(true);
        expect(catalog.has("status-badge")).toBe(false);
        expect(catalog.unregister("text")).toBe(false);
    });

    it("11. rejects invalid component names", () => {
        const catalog = new ComponentCatalog();

        expect(() => {
            catalog.register(
                definition("Invalid Name!"),
            );
        }).toThrow("Invalid component name");

        expect(catalog.list()).toHaveLength(0);
    });

    it("12. rejects invalid version strings", () => {
        const catalog = new ComponentCatalog();

        const item = definition();
        item.version = "v1";

        expect(() => {
            catalog.register(item);
        }).toThrow("Invalid component version");
    });

    it("13. rejects missing rendering handlers", () => {
        const catalog = new ComponentCatalog();

        const item = {
            ...definition(),
            render: undefined,
        } as unknown as ReusableComponentDefinition;

        expect(() => {
            catalog.register(item);
        }).toThrow("render must be a function");
    });

    it("12. rejects missing Zod schemas", () => {
        const catalog = new ComponentCatalog();

        const item = {
            ...definition(),
            schema: undefined,
        } as unknown as ReusableComponentDefinition;

        expect(() => {
            catalog.register(item);
        }).toThrow("schema must be a valid Zod schema");
    });

    it("13. protects registered defaults from input mutation", () => {
        const catalog = new ComponentCatalog();
        const item = definition();

        catalog.register(item);

        if (item.defaults) {
            item.defaults.status = "warning";
        }

        const props = catalog.resolveProps(
            "status-badge",
            { label: "Paid" },
        );

        expect(props.status).toBe("success");
    });

    it("14. returns independently copied defaults", () => {
        const catalog = new ComponentCatalog();

        catalog.register(definition());

        const retrieved = catalog.get("status-badge");

        if (retrieved?.defaults) {
            retrieved.defaults.status = "warning";
        }

        const next = catalog.get("status-badge");

        expect(next?.defaults?.status).toBe("success");
    });

    it("15. isolates different catalog instances", () => {
        const first = new ComponentCatalog();
        const second = new ComponentCatalog();

        first.register(definition());

        expect(first.has("status-badge")).toBe(true);
        expect(second.has("status-badge")).toBe(false);
    });

    it("16. detects a name reserved externally", () => {
        const registry = new ComponentRegistry();

        registry.register({
            name: "external-status",
            version: "1.0.0",
            schema: z.object({}),
        });

        const catalog = new ComponentCatalog(registry);

        expect(() => {
            catalog.register(
                definition("external-status"),
            );
        }).toThrow(ComponentCatalogError);
    });

    it("17. detects core registry removal", () => {
        const registry = new ComponentRegistry();
        const catalog = new ComponentCatalog(registry);

        catalog.register(definition());

        registry.unregister("status-badge");

        expect(() => {
            catalog.get("status-badge");
        }).toThrow(ComponentCatalogError);
    });

    it("18. does not execute handlers at registration", () => {
        const catalog = new ComponentCatalog();
        const item = definition();

        let executions = 0;

        item.render = (props, context) => {
            executions++;

            return {
                id: context.nodeId,
                type: "text",
                props: {
                    text: String(props.label),
                },
            };
        };

        catalog.register(item);

        catalog.resolveProps(
            "status-badge",
            { label: "Paid" },
        );

        expect(executions).toBe(0);

        const saved = catalog.get("status-badge");

        saved?.render(
            { label: "Paid", status: "success" },
            {
                nodeId: "payment-status",
                componentName: "status-badge",
            },
        );

        expect(executions).toBe(1);
    });

    it("19. reports unknown components clearly", () => {
        const catalog = new ComponentCatalog();

        expect(catalog.get("missing")).toBeUndefined();

        expect(() => {
            catalog.resolveProps("missing");
        }).toThrow(ComponentCatalogError);
    });
});
