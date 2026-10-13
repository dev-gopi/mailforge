
import { z } from "zod";

import type {
    EmailNode,
} from "@mailforge/core";

import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

import {
    isSafeHttpsUrl,
} from "../contracts/SafeValue.js";

const schema = z.object({
    title: z.string().min(1).max(160),
    description: z.string().min(1).max(2000),
    actionLabel: z.string().min(1).max(120).optional(),
    actionUrl: z.string().min(1).max(2048).optional(),
}).strict().superRefine((value, context) => {
    if (
        (value.actionLabel === undefined) !==
        (value.actionUrl === undefined)
    ) {
        context.addIssue({
            code: "custom",
            message:
                "actionLabel and actionUrl must be provided together",
        });
    }
});

export function createContentCardDefinition():
    ReusableComponentDefinition {
    return {
        name: "mf-content-card",
        version: "1.0.0",
        description: "Themed content card with optional action",
        allowChildren: false,
        schema,

        render: (props, context) => {
            const value = schema.parse(props);

            if (
                value.actionUrl &&
                !isSafeHttpsUrl(value.actionUrl)
            ) {
                throw new Error(
                    "ContentCard action URL must use HTTPS",
                );
            }

            const children: EmailNode[] = [
                {
                    id: `${context.nodeId}-title`,
                    type: "heading",
                    props: {
                        text: value.title,
                    },
                    attrs: { "data-mf-style": "body" },
                    styles: { fontWeight: "bold" },
                },
                {
                    id: `${context.nodeId}-description`,
                    type: "text",
                    props: {
                        text: value.description,
                    },
                    attrs: { "data-mf-style": "muted" },
                },
            ];

            if (value.actionLabel && value.actionUrl) {
                children.push({
                    id: `${context.nodeId}-action`,
                    type: "button",
                    props: {
                        text: value.actionLabel,
                        href: value.actionUrl,
                    },
                    attrs: { "data-mf-style": "primary-action" },
                });
            }

            return {
                id: context.nodeId,
                type: "section",
                attrs: { "data-mf-style": "panel-outer" },
                children: [
                    {
                        id: `${context.nodeId}-column`,
                        type: "column",
                        attrs: { "data-mf-style": "panel-inner" },
                        children,
                    },
                ],
            };
        },
    };
}
