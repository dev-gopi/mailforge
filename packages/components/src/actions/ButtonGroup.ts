
import { z } from "zod";

import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

import {
    httpsUrlSchema,
} from "../contracts/SafeValue.js";

const itemSchema = z.object({
    label: z.string().min(1).max(120),
    href: httpsUrlSchema,
    variant: z.enum([
        "primary",
        "secondary",
    ]).optional(),
}).strict();

const schema = z.object({
    items: z.array(itemSchema).min(1).max(4),
}).strict();

export function createButtonGroupDefinition():
    ReusableComponentDefinition {
    return {
        name: "mf-button-group",
        version: "1.0.0",
        description: "Group of email action buttons",
        allowChildren: false,
        schema,

        render: (props, context) => {
            const value = schema.parse(props);

            return value.items.map((item, index) => ({
                id: `${context.nodeId}-action-${index}`,
                type: "button",

                props: {
                    text: item.label,
                    href: item.href,
                },

                ...(item.variant === "secondary"
                    ? {
                        styles: {
                            backgroundColor: "#475569",
                        },
                    }
                    : {}),
            }));
        },
    };
}
