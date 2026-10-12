import { z } from "zod";

import type {
    EmailNode,
} from "@mailforge/core";

import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

const schema = z.object({
    message: z.string().min(1).max(2000),
    title: z.string().min(1).max(160).optional(),
    variant: z.enum(["info", "success", "warning", "tip"]).default("info"),
}).strict();

const VARIANT_COLORS = {
    info: { bg: "#eff6ff", text: "#1e40af" },
    success: { bg: "#f0fdf4", text: "#166534" },
    warning: { bg: "#fffbeb", text: "#92400e" },
    tip: { bg: "#faf5ff", text: "#6b21a8" },
} as const;

export function createCalloutBoxDefinition(): ReusableComponentDefinition {
    return {
        name: "mf-callout-box",
        version: "1.0.0",
        description: "Prominent alert and callout box with styled accent",
        allowChildren: false,
        schema,
        defaults: {
            variant: "info",
        },

        render: (props, context) => {
            const value = schema.parse(props);
            const variant = value.variant as keyof typeof VARIANT_COLORS;
            const colors = VARIANT_COLORS[variant];

            const columnChildren: EmailNode[] = [];

            if (value.title) {
                columnChildren.push({
                    id: `${context.nodeId}-title`,
                    type: "heading",
                    props: {
                        text: value.title,
                    },
                    styles: {
                        color: colors.text,
                        fontSize: 16,
                        padding: "4px",
                    },
                });
            }

            columnChildren.push({
                id: `${context.nodeId}-message`,
                type: "text",
                props: {
                    text: value.message,
                },
                styles: {
                    color: "#374151",
                    fontSize: 14,
                    lineHeight: "20px",
                    padding: "4px",
                },
            });

            return {
                id: context.nodeId,
                type: "section",
                styles: {
                    backgroundColor: colors.bg,
                    padding: "16px",
                },
                children: [
                    {
                        id: `${context.nodeId}-column`,
                        type: "column",
                        children: columnChildren,
                    },
                ],
            };
        },
    };
}

