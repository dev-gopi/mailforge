
import type {
    EmailDocument,
} from "../document/EmailDocument.js";

import type {
    EmailNode,
} from "../document/EmailNode.js";

import {
    ComponentRegistry,
} from "../components/ComponentRegistry.js";

import {
    ComponentValidator,
} from "../components/ComponentValidator.js";

import type {
    DocumentPatch,
    EmailSlot,
} from "./Patch.types.js";

type RootKey = "header" | "footer" | "copyright";

type NodeLocation =
    | {
        kind: "root";
        key: RootKey;
        node: EmailNode;
    }
    | {
        kind: "array";
        nodes: EmailNode[];
        index: number;
        node: EmailNode;
    };

const MAX_PATCHES = 200;

export class DocumentCustomizer {
    private readonly validator: ComponentValidator;

    constructor(
        registry: ComponentRegistry = new ComponentRegistry(),
    ) {
        this.validator = new ComponentValidator(registry);
    }

    public apply(
        source: EmailDocument,
        patches: readonly DocumentPatch[],
    ): EmailDocument {
        if (patches.length > MAX_PATCHES) {
            throw new Error(
                `Maximum ${MAX_PATCHES} patches allowed`,
            );
        }

        this.assertValid(source, "Source document");

        // Every batch works on a separate copy.
        const draft: EmailDocument = structuredClone(source);

        for (const [index, patch] of patches.entries()) {
            try {
                this.applyOne(draft, patch);
            } catch (error) {
                const message = error instanceof Error
                    ? error.message
                    : String(error);

                throw new Error(
                    `Patch ${index} (${patch.op}) failed: ${message}`,
                    { cause: error },
                );
            }
        }

        this.assertValid(draft, "Customized document");

        return draft;
    }

    private assertValid(
        document: unknown,
        label: string,
    ): void {
        const result = this.validator.validate(document);

        if (!result.valid) {
            throw new Error(
                `${label} is invalid:\n` +
                result.errors
                    .map((issue) =>
                        `${issue.path}: ${issue.message}`,
                    )
                    .join("\n"),
            );
        }
    }

    private applyOne(
        document: EmailDocument,
        patch: DocumentPatch,
    ): void {
        if (patch.op === "slot") {
            this.applySlot(document, patch.slot, patch.nodes);
            return;
        }

        const location = this.findNode(
            document,
            patch.target,
        );

        if (!location) {
            throw new Error(
                `Component not found: ${patch.target}`,
            );
        }

        switch (patch.op) {
            case "update": {
                const node = location.node;

                if (patch.props !== undefined) {
                    node.props = {
                        ...node.props,
                        ...structuredClone(patch.props),
                    };
                }

                if (patch.styles !== undefined) {
                    node.styles = {
                        ...node.styles,
                        ...structuredClone(patch.styles),
                    };
                }

                if (patch.attrs !== undefined) {
                    node.attrs = {
                        ...node.attrs,
                        ...structuredClone(patch.attrs),
                    };
                }

                return;
            }

            case "replace": {
                const replacement = structuredClone(patch.node);

                if (location.kind === "root") {
                    document[location.key] = replacement;
                } else {
                    location.nodes[location.index] = replacement;
                }

                return;
            }

            case "remove": {
                if (location.kind === "root") {
                    delete document[location.key];
                } else {
                    location.nodes.splice(location.index, 1);
                }

                return;
            }

            case "insertBefore": {
                if (location.kind === "root") {
                    throw new Error(
                        "Cannot insert beside a root section; use a slot",
                    );
                }

                location.nodes.splice(
                    location.index,
                    0,
                    structuredClone(patch.node),
                );

                return;
            }

            case "insertAfter": {
                if (location.kind === "root") {
                    throw new Error(
                        "Cannot insert beside a root section; use a slot",
                    );
                }

                location.nodes.splice(
                    location.index + 1,
                    0,
                    structuredClone(patch.node),
                );

                return;
            }
        }
    }

    private applySlot(
        document: EmailDocument,
        slot: EmailSlot,
        nodes: EmailNode[],
    ): void {
        const additions = structuredClone(nodes);

        if (slot === "body.start") {
            document.body.unshift(...additions);
            return;
        }

        if (slot === "body.end") {
            document.body.push(...additions);
            return;
        }

        const [section, position] = slot.split(".");

        if (
            section !== "header" &&
            section !== "footer"
        ) {
            throw new Error(`Unsupported slot: ${slot}`);
        }

        const parent = document[section];

        if (!parent) {
            throw new Error(
                `Cannot use ${slot}: ${section} is missing`,
            );
        }

        if (parent.type !== section) {
            throw new Error(
                `Slot ${slot} requires a ${section} component`,
            );
        }

        parent.children ??= [];

        if (position === "start") {
            parent.children.unshift(...additions);
        } else if (position === "end") {
            parent.children.push(...additions);
        } else {
            throw new Error(`Unsupported slot: ${slot}`);
        }
    }

    private findNode(
        document: EmailDocument,
        id: string,
    ): NodeLocation | undefined {
        const search = (
            nodes: EmailNode[],
        ): NodeLocation | undefined => {
            for (let index = 0; index < nodes.length; index++) {
                const node = nodes[index];

                if (!node) continue;

                if (node.id === id) {
                    return {
                        kind: "array",
                        nodes,
                        index,
                        node,
                    };
                }

                if (node.children) {
                    const found = search(node.children);

                    if (found) return found;
                }
            }

            return undefined;
        };

        const roots: RootKey[] = [
            "header",
            "footer",
            "copyright",
        ];

        for (const key of roots) {
            const node = document[key];

            if (!node) continue;

            if (node.id === id) {
                return {
                    kind: "root",
                    key,
                    node,
                };
            }

            if (node.children) {
                const found = search(node.children);

                if (found) return found;
            }
        }

        return search(document.body);
    }
}
