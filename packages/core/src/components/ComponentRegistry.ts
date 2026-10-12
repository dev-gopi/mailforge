import type { EmailNodeValue } from
    "../document/EmailNode.js";

import type {
    ComponentDefinition,
    ComponentInfo,
} from "./ComponentDefinition.js";

import {
    BUILTIN_COMPONENTS,
} from "./BuiltinComponents.js";

const componentNamePattern =
    /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

const componentVersionPattern =
    /^\d+\.\d+\.\d+$/;

export class ComponentRegistry {
    private readonly components =
        new Map<string, ComponentDefinition>();

    constructor(registerBuiltins = true) {
        if (registerBuiltins) {
            for (const component of BUILTIN_COMPONENTS) {
                this.register(component);
            }
        }
    }

    public register(definition: ComponentDefinition): void {
        if (!componentNamePattern.test(definition.name)) {
            throw new Error(
                `Invalid component name: ${definition.name}`,
            );
        }

        if (!componentVersionPattern.test(
            definition.version,
        )) {
            throw new Error(
                `Invalid component version: ${definition.version}`,
            );
        }

        if (this.components.has(definition.name)) {
            throw new Error(
                `Component already registered: ${definition.name}`,
            );
        }

        if (
            definition.defaults !== undefined &&
            !definition.schema.safeParse(
                definition.defaults,
            ).success
        ) {
            // Partial defaults are allowed, so validation
            // occurs against merged props at usage time.
        }

        const stored: ComponentDefinition = {
            ...definition,
            defaults: definition.defaults
                ? structuredClone(definition.defaults)
                : undefined,
        };

        this.components.set(definition.name, stored);
    }

    public has(name: string): boolean {
        return this.components.has(name);
    }

    public get(
        name: string,
    ): ComponentDefinition | undefined {
        const definition = this.components.get(name);

        if (!definition) {
            return undefined;
        }

        return {
            ...definition,
            defaults: definition.defaults
                ? structuredClone(definition.defaults)
                : undefined,
        };
    }

    public list(): ComponentInfo[] {
        return [...this.components.values()]
            .map((component) => ({
                name: component.name,
                version: component.version,
                ...(component.description !== undefined
                    ? { description: component.description }
                    : {}),
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    public getDefaults(
        name: string,
    ): Record<string, EmailNodeValue> {
        const definition = this.components.get(name);

        if (!definition) {
            throw new Error(
                `Component not found: ${name}`,
            );
        }

        return definition.defaults
            ? structuredClone(definition.defaults)
            : {};
    }

    public resolveProps(
        name: string,
        props: Record<string, EmailNodeValue> = {},
    ): Record<string, EmailNodeValue> {
        const definition = this.components.get(name);

        if (!definition) {
            throw new Error(
                `Component not found: ${name}`,
            );
        }

        const merged = {
            ...this.getDefaults(name),
            ...structuredClone(props),
        };

        const result = definition.schema.safeParse(merged);

        if (!result.success) {
            throw new Error(
                `Invalid props for component '${name}': ` +
                result.error.issues
                    .map((issue) => issue.message)
                    .join("; "),
            );
        }

        return structuredClone(merged);
    }

    public unregister(name: string): boolean {
        return this.components.delete(name);
    }
}