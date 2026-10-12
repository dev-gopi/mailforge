
import { z } from "zod";

import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

const schema = z.object({
    leftTitle: z.string().min(1).max(120),
    leftText: z.string().min(1).max(1500),
    rightTitle: z.string().min(1).max(120),
    rightText: z.string().min(1).max(1500),
}).strict();

export function createTwoColumnLayoutDefinition():
    ReusableComponentDefinition {
    return {
        name: "mf-two-column",
        version: "1.0.0",
        description: "Responsive two-column email section",
        allowChildren: false,
        schema,

        render: (props, context) => {
            const value = schema.parse(props);

            return {
                id: context.nodeId,
                type: "section",

                children: [
                    {
                        id: `${context.nodeId}-left`,
                        type: "column",

                        children: [
                            {
                                id: `${context.nodeId}-left-heading`,
                                type: "heading",
                                props: {
                                    text: value.leftTitle,
                                },
                            },
                            {
                                id: `${context.nodeId}-left-text`,
                                type: "text",
                                props: {
                                    text: value.leftText,
                                },
                            },
                        ],
                    },

                    {
                        id: `${context.nodeId}-right`,
                        type: "column",

                        children: [
                            {
                                id: `${context.nodeId}-right-heading`,
                                type: "heading",
                                props: {
                                    text: value.rightTitle,
                                },
                            },
                            {
                                id: `${context.nodeId}-right-text`,
                                type: "text",
                                props: {
                                    text: value.rightText,
                                },
                            },
                        ],
                    },
                ],
            };
        },
    };
}
