import { z } from "zod";

import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

const schema = z.object({
    text: z.string().min(1).max(80),
}).strict();

export function createDividerWithTextDefinition(): ReusableComponentDefinition {
    return {
        name: "mf-divider-with-text",
        version: "1.0.0",
        description: "Divider line with centered accent text label",
        allowChildren: false,
        schema,

        render: (props, context) => {
            const value = schema.parse(props);

            return {
                id: context.nodeId,
                type: "section",
                children: [
                    {
                        id: `${context.nodeId}-column`,
                        type: "column",
                        children: [
                            {
                                id: `${context.nodeId}-divider-before`,
                                type: "divider",
                                styles: {
                                    padding: "4px",
                                    color: "#e5e7eb",
                                },
                            },
                            {
                                id: `${context.nodeId}-text`,
                                type: "text",
                                props: {
                                    text: value.text,
                                },
                                styles: {
                                    textAlign: "center",
                                    fontSize: 12,
                                    fontWeight: "bold",
                                    color: "#6b7280",
                                    padding: "4px",
                                },
                            },
                            {
                                id: `${context.nodeId}-divider-after`,
                                type: "divider",
                                styles: {
                                    padding: "4px",
                                    color: "#e5e7eb",
                                },
                            },
                        ],
                    },
                ],
            };
        },
    };
}

