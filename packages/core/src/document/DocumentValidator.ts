import { z } from "zod";

import type { EmailDocument } from "./EmailDocument.js";
import type { EmailNode } from "./EmailNode.js";

const MAX_DEPTH = 20;
const MAX_NODES = 1000;
const MAX_ATTRIBUTE_LENGTH = 4096;

const attributeNamePattern =
    /^[a-zA-Z_:][a-zA-Z0-9_.:-]*$/;

const eventHandlerPattern = /^on[a-z]+$/i;

const dangerousAttributeNames = new Set([
    "srcdoc",
    "formaction",
]);

const headerText = z.string().refine(
    value => !/\p{Cc}/u.test(value),
    "Email headers must not contain control characters",
);

const EmailNodeSchema: z.ZodType<EmailNode> =
    z.lazy(() =>
        z.object({
            id: z.string().trim().min(1),

            type: z.string().trim().min(1),

            props: z.record(
                z.string(),
                z.json(),
            ).optional(),

            styles: z.record(
                z.string(),
                z.union([
                    z.string(),
                    z.number(),
                ]),
            ).optional(),

            attrs: z.record(
                z.string(),
                z.union([
                    z.string(),
                    z.number(),
                    z.boolean(),
                ]),
            ).optional(),

            children: z.array(
                EmailNodeSchema,
            ).optional(),
        }).strict(),
    );

const EmailDocumentSchema = z.object({
    schemaVersion: z.literal("1.0"),

    id: z.string().trim().min(1),

    version: z.string().regex(
        /^\d+\.\d+\.\d+$/,
        "Version must be in X.Y.Z format",
    ),

    subject: headerText.trim().min(1),

    preheader: headerText.optional(),

    locale: z.string().optional(),

    direction: z.enum(["ltr", "rtl"]).optional(),

    metadata: z.record(
        z.string(),
        z.string(),
    ).optional(),

    head: z.object({
        title: z.string().optional(),
        customCss: z.string().optional(),
        bodyBackgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    }).strict().optional(),

    header: EmailNodeSchema.optional(),

    body: z.array(EmailNodeSchema),

    footer: EmailNodeSchema.optional(),

    copyright: EmailNodeSchema.optional(),
}).strict();

export interface DocumentValidationIssue {
    path: string;
    message: string;
}

export interface DocumentValidationResult {
    valid: boolean;
    errors: DocumentValidationIssue[];
}

export class DocumentValidator {
    public validate(
        input: unknown,
    ): DocumentValidationResult {
        const result = EmailDocumentSchema.safeParse(input);

        if (!result.success) {
            return {
                valid: false,
                errors: result.error.issues.map((issue) => ({
                    path: issue.path.join(".") || "document",
                    message: issue.message,
                })),
            };
        }

        const document: EmailDocument = result.data;

        const errors: DocumentValidationIssue[] = [];
        const ids = new Set<string>();

        let nodeCount = 0;

        const walk = (
            node: EmailNode,
            path: string,
            depth: number,
        ): void => {
            nodeCount++;

            if (nodeCount > MAX_NODES) {
                if (nodeCount === MAX_NODES + 1) {
                    errors.push({
                        path,
                        message: `Document exceeds ${MAX_NODES} nodes`,
                    });
                }

                return;
            }

            if (depth > MAX_DEPTH) {
                errors.push({
                    path,
                    message: `Node nesting exceeds ${MAX_DEPTH} levels`,
                });

                return;
            }

            if (ids.has(node.id)) {
                errors.push({
                    path: `${path}.id`,
                    message: `Duplicate node ID: ${node.id}`,
                });
            } else {
                ids.add(node.id);
            }

            if (node.attrs) {
                for (const [name, value] of Object.entries(
                    node.attrs,
                )) {
                    const attributePath = `${path}.attrs.${name}`;

                    if (!attributeNamePattern.test(name)) {
                        errors.push({
                            path: attributePath,
                            message: `Invalid attribute name: ${name}`,
                        });

                        continue;
                    }

                    if (
                        eventHandlerPattern.test(name) ||
                        dangerousAttributeNames.has(
                            name.toLowerCase(),
                        )
                    ) {
                        errors.push({
                            path: attributePath,
                            message: `Unsafe attribute: ${name}`,
                        });

                        continue;
                    }

                    if (
                        String(value).length >
                        MAX_ATTRIBUTE_LENGTH
                    ) {
                        errors.push({
                            path: attributePath,
                            message: "Attribute value is too long",
                        });
                    }
                }
            }

            for (
                let index = 0;
                index < (node.children?.length ?? 0);
                index++
            ) {
                const child = node.children?.[index];

                if (child) {
                    walk(
                        child,
                        `${path}.children.${index}`,
                        depth + 1,
                    );
                }
            }
        };

        if (document.header) {
            walk(document.header, "header", 1);
        }

        document.body.forEach((node, index) => {
            walk(node, `body.${index}`, 1);
        });

        if (document.footer) {
            walk(document.footer, "footer", 1);
        }

        if (document.copyright) {
            walk(document.copyright, "copyright", 1);
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
                "Invalid email document:\n" +
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
