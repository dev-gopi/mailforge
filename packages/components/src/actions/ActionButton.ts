
import { z } from "zod";

import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

import {
    httpsUrlSchema,
} from "../contracts/SafeValue.js";

/**
 * Theme-aware action button.
 *
 * The primary variant inherits the background
 * color from the theme applicator.
 */
export function createActionButtonDefinition():
    ReusableComponentDefinition {
    return {
        name: "mf-action-button",
        version: "1.0.0",
        description: "Reusable HTTPS call-to-action",
        allowChildren: false,

        schema: z.object({
            label: z.string().min(1).max(120),
            href: httpsUrlSchema,
            variant: z.enum([
                "primary",
                "secondary",
            ]),
        }).strict(),

        defaults: {
            variant: "primary",
        },

        render: (props, context) => {
            const secondary =
                props.variant === "secondary";

            return {
                id: context.nodeId,
                type: "button",

                props: {
                    text: String(props.label),
                    href: String(props.href),
                },

                attrs: {
                    "data-mf-style": secondary ? "quiet-action" : "primary-action",
                },

                ...(secondary
                    ? {
                        styles: {
                            backgroundColor: "#475569",
                        },
                    }
                    : {}),
            };
        },
    };
}
