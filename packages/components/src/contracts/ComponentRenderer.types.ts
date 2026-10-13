
import type {
    ComponentDefinition,
    EmailNode,
    EmailNodeValue,
} from "@mailforge/core";

/**
 * Information available to a component handler
 * when it is executed by the future expander.
 */
export interface ComponentRenderContext {
    readonly nodeId: string;
    readonly componentName: string;
}

/**
 * A renderer returns structured EmailNode objects.
 *
 * Multiple nodes are reserved for composite
 * components.
 */
export type ComponentRenderOutput =
    | EmailNode
    | readonly EmailNode[];

/**
 * Function supplied by the component developer.
 *
 * It must not directly return HTML or MJML strings.
 * Later, its output will be validated by core.
 */
export type ComponentRenderHandler = (
    props: Readonly<Record<string, EmailNodeValue>>,
    context: Readonly<ComponentRenderContext>,
) => ComponentRenderOutput;

/**
 * Reuse the EXISTING core component contract.
 *
 * Add only a rendering handler.
 */
export interface ReusableComponentDefinition
    extends ComponentDefinition {
    render: ComponentRenderHandler;
}
