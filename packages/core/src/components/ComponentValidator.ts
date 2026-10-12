import type {
    EmailDocument,
} from "../document/EmailDocument.js";

import type {
    EmailNode,
} from "../document/EmailNode.js";

import {
    DocumentValidator,
} from "../document/DocumentValidator.js";

import type {
    ComponentValidationIssue,
} from "./ComponentDefinition.js";

import {
    ComponentRegistry,
} from "./ComponentRegistry.js";

export interface ComponentValidationResult {
    valid: boolean;
    errors: ComponentValidationIssue[];
}

export class ComponentValidator {
    private readonly documentValidator =
        new DocumentValidator();

    constructor(
        private readonly registry: ComponentRegistry,
    ) { }

    public validate(
        input: unknown,
    ): ComponentValidationResult {
        const documentResult =
            this.documentValidator.validate(input);

        if (!documentResult.valid) {
            return {
                valid: false,
                errors: documentResult.errors,
            };
        }

        const document = input as EmailDocument;
        const errors: ComponentValidationIssue[] = [];

        const walk = (
            node: EmailNode,
            path: string,
        ): void => {
            const definition =
                this.registry.get(node.type);

            if (!definition) {
                errors.push({
                    path: `${path}.type`,
                    message:
                        `Unknown component: ${node.type}`,
                });

                return;
            }

            if (
                definition.allowChildren === false &&
                node.children &&
                node.children.length > 0
            ) {
                errors.push({
                    path: `${path}.children`,
                    message:
                        `Component '${node.type}' does not allow children`,
                });
            }

            try {
                this.registry.resolveProps(
                    node.type,
                    node.props ?? {},
                );
            } catch (error) {
                errors.push({
                    path: `${path}.props`,
                    message:
                        error instanceof Error
                            ? error.message
                            : "Invalid component properties",
                });
            }

            node.children?.forEach((child, index) => {
                walk(
                    child,
                    `${path}.children.${index}`,
                );
            });
        };

        if (document.header) {
            walk(document.header, "header");
        }

        document.body.forEach((node, index) => {
            walk(node, `body.${index}`);
        });

        if (document.footer) {
            walk(document.footer, "footer");
        }

        if (document.copyright) {
            walk(document.copyright, "copyright");
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    public validateOrThrow(input: unknown): void {
        const result = this.validate(input);

        if (!result.valid) {
            throw new Error(
                "Component validation failed:\n" +
                result.errors
                    .map(
                        (error) =>
                            `${error.path}: ${error.message}`,
                    )
                    .join("\n"),
            );
        }
    }
}