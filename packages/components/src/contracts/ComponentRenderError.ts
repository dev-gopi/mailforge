
export type ComponentCatalogErrorCode =
    | "COMPONENT_CATALOG_INVALID"
    | "COMPONENT_CATALOG_DUPLICATE"
    | "COMPONENT_CATALOG_NOT_FOUND"
    | "COMPONENT_CATALOG_OUT_OF_SYNC";

/**
 * Errors raised while registering or retrieving
 * reusable component definitions.
 */
export class ComponentCatalogError extends Error {
    constructor(
        public readonly code: ComponentCatalogErrorCode,
        public readonly componentName: string,
        reason: string,
    ) {
        super(
            `MailForge component "${componentName}": ${reason}`,
        );

        this.name = "ComponentCatalogError";
    }
}

/**
 * Reserved for errors raised while executing
 * a component handler.
 */
export class ComponentRenderError extends Error {
    public readonly code = "COMPONENT_RENDER_FAILED";

    constructor(
        public readonly componentName: string,
        reason: string,
    ) {
        super(
            `Cannot render component "${componentName}": ${reason}`,
        );

        this.name = "ComponentRenderError";
    }
}
