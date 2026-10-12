
import { z } from "zod";

import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

import {
    httpsUrlSchema,
} from "../contracts/SafeValue.js";

export function createBrandLogoDefinition():
    ReusableComponentDefinition {
    return {
        name: "mf-brand-logo",
        version: "1.0.0",
        description: "Company logo with name fallback",
        allowChildren: false,

        schema: z.object({
            name: z.string().min(1).max(120),
            src: httpsUrlSchema.optional(),
        }).strict(),

        render: (props, context) => {
            const name = String(props.name);

            // Without a logo URL, render the company
            // name as a heading.
            if (props.src === undefined) {
                return {
                    id: context.nodeId,
                    type: "heading",

                    props: {
                        text: name,
                        level: 2,
                    },

                    styles: {
                        textAlign: "center",
                    },
                };
            }

            return {
                id: context.nodeId,
                type: "image",

                props: {
                    src: String(props.src),
                    alt: `${name} logo`,
                },

                styles: {
                    width: 140,
                    textAlign: "center",
                },
            };
        },
    };
}
