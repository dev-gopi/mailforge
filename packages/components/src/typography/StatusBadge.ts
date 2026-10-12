
import { z } from "zod";

import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

const STATUS_COLORS = {
    success: "#15803d",
    warning: "#a16207",
    error: "#b91c1c",
} as const;

/**
 * Reusable status badge.
 *
 * Produces one validated "text" primitive.
 */
export function createStatusBadgeDefinition():
    ReusableComponentDefinition {
    return {
        name: "mf-status-badge",
        version: "1.0.0",
        description: "Success, warning or error status",
        allowChildren: false,

        schema: z.object({
            label: z.string().min(1).max(160),
            status: z.enum([
                "success",
                "warning",
                "error",
            ]),
        }).strict(),

        defaults: {
            status: "success",
        },

        render: (props, context) => {
            const status = props.status as
                keyof typeof STATUS_COLORS;

            return {
                id: context.nodeId,
                type: "text",

                props: {
                    text: String(props.label),
                },

                styles: {
                    color: STATUS_COLORS[status],
                    fontWeight: "bold",
                    fontSize: 14,
                    padding: "8px",
                },
            };
        },
    };
}
