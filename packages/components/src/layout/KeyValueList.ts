import { z } from "zod";

import type {
    EmailNode,
} from "@mailforge/core";

import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

const itemSchema = z.object({
    key: z.string().min(1).max(120),
    value: z.string().min(1).max(500),
}).strict();

const schema = z.object({
    title: z.string().min(1).max(160).optional(),
    items: z.array(itemSchema).min(1).max(30),
}).strict();

export function createKeyValueListDefinition(): ReusableComponentDefinition {
    return {
        name: "mf-key-value-list",
        version: "1.0.0",
        description: "Tabular metadata list for orders, accounts, and specs",
        allowChildren: false,
        schema,

        render: (props, context) => {
            const value = schema.parse(props);
            const columnChildren: EmailNode[] = [];

            if (value.title) {
                columnChildren.push({
                    id: `${context.nodeId}-title`,
                    type: "heading",
                    props: {
                        text: value.title,
                    },
                    styles: {
                        fontSize: 16,
                        padding: "4px",
                    },
                });
            }

            value.items.forEach((item, index) => {
                columnChildren.push({
                    id: `${context.nodeId}-item-${index}`,
                    type: "text",
                    props: {
                        text: `${item.key}: ${item.value}`,
                    },
                    styles: {
                        fontSize: 14,
                        color: "#374151",
                        padding: "4px",
                    },
                });
            });

            return {
                id: context.nodeId,
                type: "section",
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

