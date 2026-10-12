
import {
    ComponentRegistry,
    ComponentValidator,
    type EmailDocument,
    type EmailNode,
    type EmailNodeValue,
} from "@mailforge/core";

import {
    ComponentRenderError,
} from "../contracts/ComponentRenderError.js";

import {
    ComponentCatalog,
} from "./ComponentCatalog.js";

/**
 * Primitive leaf components supported by
 * the current MJML renderer.
 *
 * Composite/layout components are reserved
 * for Task 7.7.4.
 */
const LEAF_TYPES = new Set([
    "text",
    "heading",
    "button",
    "image",
    "divider",
    "spacer",
    "copyright",
    "raw-html",
]);

const MAX_CUSTOM_COMPONENTS = 250;

function isPlainObject(
    input: unknown,
): input is Record<string, unknown> {
    if (
        input === null ||
        typeof input !== "object" ||
        Array.isArray(input)
    ) {
        return false;
    }

    const prototype = Object.getPrototypeOf(input);

    return (
        prototype === Object.prototype ||
        prototype === null
    );
}

/**
 * Protect the handler's input from mutation.
 *
 * This freezes nested arrays and objects too.
 */
function deepFreeze<T>(input: T): Readonly<T> {
    if (
        input !== null &&
        typeof input === "object"
    ) {
        for (const value of Object.values(input)) {
            deepFreeze(value);
        }

        Object.freeze(input);
    }

    return input;
}

/**
 * Expand custom components without changing
 * the original EmailDocument.
 */
export class ComponentExpander {
    private readonly validator: ComponentValidator;

    constructor(
        private readonly registry: ComponentRegistry,
        private readonly catalog: ComponentCatalog,
    ) {
        this.validator = new ComponentValidator(registry);
    }

    public expand(
        source: EmailDocument,
    ): EmailDocument {
        // 1. Validate the document containing
        // custom component definitions.
        this.validator.validateOrThrow(source);

        // 2. Work on an independent copy.
        const document = structuredClone(source);

        let expansionCount = 0;

        const expandNode = (
            node: EmailNode,
            location: string,
        ): EmailNode => {
            // An ordinary built-in component may
            // contain custom components in children.
            if (!this.catalog.has(node.type)) {
                return {
                    ...node,
                    ...(node.children !== undefined
                        ? {
                            children: node.children.map(
                                (child, index) =>
                                    expandNode(
                                        child,
                                        `${location}.children[${index}]`,
                                    ),
                            ),
                        }
                        : {}),
                };
            }

            expansionCount++;

            if (expansionCount > MAX_CUSTOM_COMPONENTS) {
                throw new ComponentRenderError(
                    node.type,
                    `Too many custom components; ` +
                    `maximum is ${MAX_CUSTOM_COMPONENTS}`,
                );
            }

            if (
                node.children !== undefined &&
                node.children.length > 0
            ) {
                throw new ComponentRenderError(
                    node.type,
                    "Leaf custom components cannot have children",
                );
            }

            const definition = this.catalog.get(node.type);

            if (!definition) {
                throw new ComponentRenderError(
                    node.type,
                    `Component definition missing at ${location}`,
                );
            }

            // 3. Merge defaults and validate properties
            // using the existing core registry.
            const props = this.catalog.resolveProps(
                node.type,
                node.props ?? {},
            );

            const handlerProps = deepFreeze(
                structuredClone(props),
            ) as Readonly<Record<string, EmailNodeValue>>;

            const context = Object.freeze({
                nodeId: node.id,
                componentName: node.type,
            });

            // 4. Call the trusted developer handler.
            let output: unknown;

            try {
                output = definition.render(
                    handlerProps,
                    context,
                );
            } catch (error) {
                const reason =
                    error instanceof Error
                        ? error.message
                        : "Unknown handler failure";

                throw new ComponentRenderError(
                    node.type,
                    `Handler failed at ${location}: ${reason}`,
                );
            }

            // 5. Reject multiple nodes for Task 7.7.2.
            if (Array.isArray(output)) {
                throw new ComponentRenderError(
                    node.type,
                    "Multiple output nodes are not supported yet",
                );
            }

            if (!isPlainObject(output)) {
                throw new ComponentRenderError(
                    node.type,
                    "Handler must return one plain EmailNode object",
                );
            }

            // 6. A handler must retain the source ID.
            if (output.id !== node.id) {
                throw new ComponentRenderError(
                    node.type,
                    "Handler must preserve context.nodeId",
                );
            }

            if (
                typeof output.type !== "string" ||
                !LEAF_TYPES.has(output.type)
            ) {
                throw new ComponentRenderError(
                    node.type,
                    `Unsupported output type: ${String(output.type)}`,
                );
            }

            // 7. Prevent recursive custom output or
            // nested layout structures.
            if (Object.hasOwn(output, "children")) {
                throw new ComponentRenderError(
                    node.type,
                    "Custom leaf output cannot contain children",
                );
            }

            // 8. Build the final primitive.
            // Developer node overrides handler defaults.
            let expanded: EmailNode;

            try {
                const rendered = output as unknown as EmailNode;

                const styles = {
                    ...rendered.styles,
                    ...node.styles,
                };

                const attrs = {
                    ...rendered.attrs,
                    ...node.attrs,
                };

                expanded = {
                    id: node.id,
                    type: rendered.type,

                    ...(rendered.props !== undefined
                        ? {
                            props: structuredClone(rendered.props),
                        }
                        : {}),

                    ...(Object.keys(styles).length > 0
                        ? { styles }
                        : {}),

                    ...(Object.keys(attrs).length > 0
                        ? { attrs }
                        : {}),
                };
            } catch {
                throw new ComponentRenderError(
                    node.type,
                    "Handler returned unsupported property values",
                );
            }

            return expanded;
        };

        // 9. Expand all regions of the document.
        if (document.header) {
            document.header = expandNode(
                document.header,
                "header",
            );
        }

        document.body = document.body.map(
            (node, index) =>
                expandNode(
                    node,
                    `body[${index}]`,
                ),
        );

        if (document.footer) {
            document.footer = expandNode(
                document.footer,
                "footer",
            );
        }

        if (document.copyright) {
            document.copyright = expandNode(
                document.copyright,
                "copyright",
            );
        }

        // 10. Validate the final document again.
        // Unsafe URLs, invalid props, duplicate IDs
        // and unsafe attributes are rejected here.
        this.validator.validateOrThrow(document);

        return document;
    }
}
