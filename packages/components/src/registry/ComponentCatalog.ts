
import {
    ComponentRegistry,
    type ComponentDefinition,
    type ComponentInfo,
    type EmailNodeValue,
} from "@mailforge/core";

import {
    ComponentCatalogError,
} from "../contracts/ComponentRenderError.js";

import type {
    ComponentRenderHandler,
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

interface CatalogEntry {
    readonly render: ComponentRenderHandler;
    readonly schema: ComponentDefinition["schema"];
    readonly version: string;
}

/**
 * Stores reusable component definitions and
 * their associated rendering handlers.
 *
 * Schema validation remains inside
 * @mailforge/core's ComponentRegistry.
 */
export class ComponentCatalog {
    private readonly entries =
        new Map<string, CatalogEntry>();

    /**
     * Accept the same registry used by the
     * main email engine.
     *
     * If none is supplied, create a new
     * registry containing core built-ins.
     */
    constructor(
        private readonly registry: ComponentRegistry =
            new ComponentRegistry(),
    ) { }

    /**
     * Register a reusable component.
     */
    public register(
        definition: ReusableComponentDefinition,
    ): this {
        const { name, render, coreDefinition } =
            this.validateDefinition(definition);

        // Includes protection against overriding
        // the 14 built-in core components.
        if (this.registry.has(name)) {
            throw new ComponentCatalogError(
                "COMPONENT_CATALOG_DUPLICATE",
                name,
                "component is already registered",
            );
        }

        try {
            this.registry.register(coreDefinition);
        } catch (error) {
            const reason =
                error instanceof Error
                    ? error.message
                    : "unknown registration error";

            throw new ComponentCatalogError(
                "COMPONENT_CATALOG_INVALID",
                name,
                reason,
            );
        }

        this.entries.set(name, {
            render,
            version: definition.version,
            schema: definition.schema,
        });

        return this;
    }

    /**
     * Replace an existing reusable component without changing
     * references held by registered templates.
     */
    public replace(
        definition: ReusableComponentDefinition,
    ): this {
        const { name, render, coreDefinition } =
            this.validateDefinition(definition);

        if (!this.entries.has(name)) {
            throw new ComponentCatalogError(
                "COMPONENT_CATALOG_NOT_FOUND",
                name,
                "only reusable catalog components can be replaced",
            );
        }

        try {
            this.registry.replace(coreDefinition);
        } catch (error) {
            const reason =
                error instanceof Error
                    ? error.message
                    : "unknown replacement error";

            throw new ComponentCatalogError(
                "COMPONENT_CATALOG_INVALID",
                name,
                reason,
            );
        }

        this.entries.set(name, {
            render,
            version: definition.version,
            schema: definition.schema,
        });

        return this;
    }

    /** Remove a reusable component and its core validation contract. */
    public unregister(name: string): boolean {
        if (!this.entries.has(name)) {
            return false;
        }

        this.entries.delete(name);
        this.registry.unregister(name);

        return true;
    }

    private validateDefinition(
        definition: ReusableComponentDefinition,
    ): {
        name: string;
        render: ComponentRenderHandler;
        coreDefinition: ComponentDefinition;
    } {
        if (
            definition === null ||
            typeof definition !== "object" ||
            Array.isArray(definition)
        ) {
            throw new ComponentCatalogError(
                "COMPONENT_CATALOG_INVALID",
                "<unknown>",
                "definition must be an object",
            );
        }

        const name =
            typeof definition.name === "string"
                ? definition.name
                : "<unknown>";

        if (typeof definition.render !== "function") {
            throw new ComponentCatalogError(
                "COMPONENT_CATALOG_INVALID",
                name,
                "render must be a function",
            );
        }

        if (
            !definition.schema ||
            typeof definition.schema.safeParse !== "function"
        ) {
            throw new ComponentCatalogError(
                "COMPONENT_CATALOG_INVALID",
                name,
                "schema must be a valid Zod schema",
            );
        }

        /**
         * Separate the handler from core metadata.
         * The core registry should not store the
         * rendering function.
         */
        const {
            render,
            ...coreDefinition
        } = definition;

        return { name, render, coreDefinition };
    }

    /**
     * True only for components owned by this
     * catalog, not the built-in primitives.
     */
    public has(name: string): boolean {
        return this.entries.has(name);
    }

    /**
     * Retrieve an isolated definition.
     *
     * The Zod schema and trusted handler remain
     * shared references; the core registry already
     * clones the default property object.
     */
    public get(
        name: string,
    ): ReusableComponentDefinition | undefined {
        const entry = this.entries.get(name);

        if (!entry) {
            return undefined;
        }

        const definition = this.registry.get(name);

        if (
            !definition ||
            definition.version !== entry.version ||
            definition.schema !== entry.schema
        ) {
            throw new ComponentCatalogError(
                "COMPONENT_CATALOG_OUT_OF_SYNC",
                name,
                "core registry definition has changed",
            );
        }

        return {
            ...definition,
            render: entry.render,
        };
    }

    /**
     * List only custom reusable components.
     * Built-in primitive components are available
     * separately through ComponentRegistry.
     */
    public list(): ComponentInfo[] {
        return [...this.entries.keys()]
            .sort((a, b) => a.localeCompare(b))
            .map((name) => {
                const definition = this.get(name);

                if (!definition) {
                    throw new ComponentCatalogError(
                        "COMPONENT_CATALOG_OUT_OF_SYNC",
                        name,
                        "registered component cannot be retrieved",
                    );
                }

                return {
                    name: definition.name,
                    version: definition.version,
                    ...(definition.description !== undefined
                        ? { description: definition.description }
                        : {}),
                };
            });
    }

    /**
     * Resolve defaults and validate supplied props
     * using the EXISTING core registry.
     *
     * Does not execute the rendering handler.
     */
    public resolveProps(
        name: string,
        props: Record<string, EmailNodeValue> = {},
    ): Record<string, EmailNodeValue> {
        if (!this.has(name)) {
            throw new ComponentCatalogError(
                "COMPONENT_CATALOG_NOT_FOUND",
                name,
                "component is not registered in this catalog",
            );
        }

        // Also detects external registry changes.
        this.get(name);

        return this.registry.resolveProps(name, props);
    }
}
