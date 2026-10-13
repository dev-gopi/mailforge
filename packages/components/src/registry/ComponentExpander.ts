
import {
    ComponentValidator,
    type EmailDocument,
    type EmailNode,
    type EmailNodeValue,
} from "@mailforge/core";

import type {
    ComponentRegistry,
} from "@mailforge/core";

import {
    ComponentRenderError,
} from "../contracts/ComponentRenderError.js";

import type {
    ComponentCatalog,
} from "./ComponentCatalog.js";

import {
    assertBoundedHandlerOutput,
} from "../security/OutputBudget.js";

const MAX_EXPANSIONS = 250;
const MAX_NODES = 1000;
const MAX_DEPTH = 20;

const LAYOUT_TYPES = new Set([
    "header",
    "footer",
    "container",
    "section",
    "row",
    "column",
]);

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    if (
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);

    return prototype === Object.prototype ||
        prototype === null;
}

function deepFreeze<T>(value: T): Readonly<T> {
    if (value !== null && typeof value === "object") {
        for (const child of Object.values(value)) {
            deepFreeze(child);
        }

        Object.freeze(value);
    }

    return value;
}

/**
 * Enforce the subset of MJML layouts supported
 * by the existing MailForge renderer.
 */
function validateMjmlStructure(
    document: EmailDocument,
): void {
    const leaf = (node: EmailNode): void => {
        if (LAYOUT_TYPES.has(node.type)) {
            throw new Error(
                `Layout node '${node.type}' is not valid inside an MJML column`,
            );
        }

        if (node.children?.length) {
            throw new Error(
                `Leaf '${node.id}' cannot contain nested layout nodes`,
            );
        }
    };

    const topLevel = (node: EmailNode): void => {
        if (node.type === "column") {
            throw new Error(
                `Column '${node.id}' must be inside a section`,
            );
        }

        if (node.type === "section" || node.type === "row") {
            const children = node.children ?? [];
            const hasColumns = children.some(
                child => child.type === "column",
            );

            if (hasColumns) {
                if (children.some(
                    child => child.type !== "column",
                )) {
                    throw new Error(
                        `Section '${node.id}' cannot mix columns and ordinary components`,
                    );
                }

                for (const column of children) {
                    for (const child of column.children ?? []) {
                        leaf(child);
                    }
                }
            } else {
                children.forEach(leaf);
            }

            return;
        }

        if (
            node.type === "header" ||
            node.type === "footer" ||
            node.type === "container"
        ) {
            const children = node.children ?? [];
            const hasSections = children.some(
                child => LAYOUT_TYPES.has(child.type),
            );

            if (hasSections) {
                if (
                    Object.keys(node.attrs ?? {}).length ||
                    Object.keys(node.styles ?? {}).length
                ) {
                    throw new Error(
                        `Container '${node.id}' with nested sections cannot carry attributes or styles`,
                    );
                }

                children.forEach(topLevel);
            } else {
                children.forEach(leaf);
            }

            return;
        }

        leaf(node);
    };

    if (document.header) topLevel(document.header);
    document.body.forEach(topLevel);
    if (document.footer) topLevel(document.footer);
    if (document.copyright) topLevel(document.copyright);
}

/**
 * Expand user-defined components into core
 * primitive nodes and MJML-compatible layouts.
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
        // Validate the source, including custom props.
        this.validator.validateOrThrow(source);

        const document = structuredClone(source);

        let expansions = 0;
        let nodes = 0;

        /**
         * Give every generated node a deterministic
         * identity based on the original component ID.
         *
         * We do not trust handler-supplied child IDs.
         */
        const normalizeGenerated = (
            raw: unknown,
            id: string,
            treeDepth: number,
            visited: WeakSet<object>,
        ): EmailNode => {
            if (treeDepth > MAX_DEPTH) {
                throw new ComponentRenderError(
                    id,
                    `Generated tree exceeds ${MAX_DEPTH} levels`,
                );
            }
            if (!isRecord(raw)) {
                throw new ComponentRenderError(
                    id,
                    "Handler output must contain EmailNode objects",
                );
            }

            if (visited.has(raw)) {
                throw new ComponentRenderError(
                    id,
                    "Cyclic output object detected",
                );
            }

            visited.add(raw);

            if (typeof raw.type !== "string") {
                throw new ComponentRenderError(
                    id,
                    "Generated node must have a component type",
                );
            }

            const allowed = new Set([
                "id", "type", "props",
                "styles", "attrs", "children",
            ]);

            for (const key of Object.keys(raw)) {
                if (!allowed.has(key)) {
                    throw new ComponentRenderError(
                        id,
                        `Unsupported generated field '${key}'`,
                    );
                }
            }

            const result: EmailNode = {
                id,
                type: raw.type,
            };

            if (raw.props !== undefined) {
                result.props = structuredClone(
                    raw.props,
                ) as EmailNode["props"];
            }

            if (raw.styles !== undefined) {
                result.styles = structuredClone(
                    raw.styles,
                ) as EmailNode["styles"];
            }

            if (raw.attrs !== undefined) {
                result.attrs = structuredClone(
                    raw.attrs,
                ) as EmailNode["attrs"];
            }

            if (raw.children !== undefined) {
                if (!Array.isArray(raw.children)) {
                    throw new ComponentRenderError(
                        id,
                        "Generated children must be an array",
                    );
                }

                result.children = raw.children.map(
                    (child: unknown, index: number) =>
                        normalizeGenerated(
                            child,
                            `${id}--${index}`,
                            treeDepth + 1,
                            visited,
                        ),
                );
            }

            visited.delete(raw);

            return result;
        };

        const expandArray = (
            input: EmailNode[],
            depth: number,
            stack: readonly string[],
        ): EmailNode[] => {
            return input.flatMap(
                node => expandNode(node, depth, stack),
            );
        };

        const expandNode = (
            node: EmailNode,
            depth: number,
            stack: readonly string[],
        ): EmailNode[] => {
            if (depth > MAX_DEPTH) {
                throw new ComponentRenderError(
                    node.type,
                    `Expansion depth exceeds ${MAX_DEPTH}`,
                );
            }

            // An ordinary primitive or layout node.
            if (!this.catalog.has(node.type)) {
                const copy: EmailNode = {
                    ...node,
                    ...(node.children !== undefined
                        ? {
                            children: expandArray(
                                node.children,
                                depth + 1,
                                stack,
                            ),
                        }
                        : {}),
                };

                nodes++;

                if (nodes > MAX_NODES) {
                    throw new ComponentRenderError(
                        node.type,
                        `Expanded document exceeds ${MAX_NODES} nodes`,
                    );
                }

                return [copy];
            }

            // A component must not recursively invoke
            // itself, directly or indirectly.
            if (stack.includes(node.type)) {
                throw new ComponentRenderError(
                    node.type,
                    `Component expansion cycle: ${[
                        ...stack,
                        node.type,
                    ].join(" -> ")}`,
                );
            }

            expansions++;

            if (expansions > MAX_EXPANSIONS) {
                throw new ComponentRenderError(
                    node.type,
                    `Too many custom components; maximum is ${MAX_EXPANSIONS}`,
                );
            }

            if (node.children?.length) {
                throw new ComponentRenderError(
                    node.type,
                    "Custom components cannot accept source children in this version",
                );
            }

            const definition = this.catalog.get(node.type);

            if (!definition) {
                throw new ComponentRenderError(
                    node.type,
                    "Registered component definition is missing",
                );
            }

            const props = this.catalog.resolveProps(
                node.type,
                node.props ?? {},
            );

            const safeProps = deepFreeze(
                structuredClone(props),
            ) as Readonly<Record<string, EmailNodeValue>>;

            const context = Object.freeze({
                nodeId: node.id,
                componentName: node.type,
            });

            let output: unknown;

            try {
                output = definition.render(
                    safeProps,
                    context,
                );
                // Protect against oversized or cyclic handler output
                // before attempting deep copies or recursive expansion.
                assertBoundedHandlerOutput(
                    output,
                    node.type,
                );
            } catch (error) {
                const reason = error instanceof Error
                    ? error.message
                    : "Unknown rendering failure";

                throw new ComponentRenderError(
                    node.type,
                    `Handler failed: ${reason}`,
                );
            }

            const multi = Array.isArray(output);
            const outputNodes: unknown[] = multi
                ? output as unknown[]
                : [output];

            if (outputNodes.length === 0) {
                throw new ComponentRenderError(
                    node.type,
                    "Handler returned no output nodes",
                );
            }

            if (outputNodes.length > MAX_NODES) {
                throw new ComponentRenderError(
                    node.type,
                    "Handler returned too many nodes",
                );
            }

            // Preserve the contract for
            // existing single-node components.
            if (!multi && isRecord(output)) {
                if (output.id !== node.id) {
                    throw new ComponentRenderError(
                        node.type,
                        "Handler must preserve context.nodeId",
                    );
                }
            }

            const nextStack = [...stack, node.type];

            return outputNodes.flatMap(
                (raw, index): EmailNode[] => {
                    const generatedId = multi
                        ? `${node.id}--${index}`
                        : node.id;

                    const generated = normalizeGenerated(
                        raw,
                        generatedId,
                        depth,
                        new WeakSet<object>(),
                    );

                    // Original styles/attrs override handler
                    // defaults. For multi-node output they
                    // apply only to its first root node.
                    if (index === 0) {
                        generated.styles = {
                            ...generated.styles,
                            ...node.styles,
                        };

                        generated.attrs = {
                            ...generated.attrs,
                            ...node.attrs,
                        };

                        if (!Object.keys(generated.styles).length) {
                            delete generated.styles;
                        }

                        if (!Object.keys(generated.attrs).length) {
                            delete generated.attrs;
                        }
                    }

                    return expandNode(
                        generated,
                        depth + 1,
                        nextStack,
                    );
                },
            );
        };

        if (document.header) {
            const output = expandNode(
                document.header,
                1,
                [],
            );

            if (output.length !== 1) {
                throw new ComponentRenderError(
                    "header",
                    "Header must resolve to one root node",
                );
            }

            document.header = output[0]!;
        }

        document.body = expandArray(
            document.body,
            1,
            [],
        );

        if (document.footer) {
            const output = expandNode(
                document.footer,
                1,
                [],
            );

            if (output.length !== 1) {
                throw new ComponentRenderError(
                    "footer",
                    "Footer must resolve to one root node",
                );
            }

            document.footer = output[0]!;
        }

        if (document.copyright) {
            const output = expandNode(
                document.copyright,
                1,
                [],
            );

            if (output.length !== 1) {
                throw new ComponentRenderError(
                    "copyright",
                    "Copyright must resolve to one root node",
                );
            }

            document.copyright = output[0]!;
        }

        // Detect duplicate IDs, invalid props,
        // unsafe attributes, and structure errors.
        this.validator.validateOrThrow(document);

        // Reject unsupported layout nesting before MJML.
        validateMjmlStructure(document);

        return document;
    }
}
