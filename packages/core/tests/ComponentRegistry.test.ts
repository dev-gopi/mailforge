import {
    describe,
    expect,
    it,
} from "vitest";

import { z } from "zod";

import {
    ComponentRegistry,
    BUILTIN_COMPONENTS,
} from "../src/index.js";

describe("ComponentRegistry", () => {
    it("loads built-in components", () => {
        const registry = new ComponentRegistry();

        expect(registry.has("header")).toBe(true);
        expect(registry.has("footer")).toBe(true);
        expect(registry.has("copyright")).toBe(true);
        expect(registry.has("button")).toBe(true);
    });

    it("registers a custom component", () => {
        const registry = new ComponentRegistry();

        registry.register({
            name: "company-banner",
            version: "1.0.0",
            schema: z.object({
                title: z.string(),
            }),
            allowChildren: false,
        });

        expect(
            registry.has("company-banner"),
        ).toBe(true);
    });

    it("rejects duplicate components", () => {
        const registry = new ComponentRegistry();

        expect(() => {
            registry.register({
                name: "button",
                version: "1.0.0",
                schema: z.object({}),
            });
        }).toThrow("Component already registered");
    });

    it("rejects invalid component names", () => {
        const registry = new ComponentRegistry();

        expect(() => {
            registry.register({
                name: "Invalid Component!",
                version: "1.0.0",
                schema: z.object({}),
            });
        }).toThrow("Invalid component name");
    });

    it("resolves component defaults", () => {
        const registry = new ComponentRegistry();

        const props = registry.resolveProps(
            "button",
            {
                href: "https://example.com",
            },
        );

        expect(props.text).toBe("Click Here");
        expect(props.href).toBe(
            "https://example.com",
        );
    });

    it("rejects invalid component props", () => {
        const registry = new ComponentRegistry();

        expect(() => {
            registry.resolveProps("button", {
                href: "javascript:alert(1)",
            });
        }).toThrow("Invalid props");
    });

    it("lists registered components", () => {
        const registry = new ComponentRegistry();

        const components = registry.list();

        expect(components.length).toBe(BUILTIN_COMPONENTS.length);
        expect(components.some((component) => component.name === "rich-text")).toBe(true);
        expect(
            components.some(
                (component) => component.name === "header",
            ),
        ).toBe(true);
    });

    it("returns isolated default properties", () => {
        const registry = new ComponentRegistry();

        const defaults = registry.getDefaults("button");

        defaults.text = "Changed";

        expect(
            registry.getDefaults("button").text,
        ).toBe("Click Here");
    });
});