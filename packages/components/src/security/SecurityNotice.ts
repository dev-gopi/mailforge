
import { z } from "zod";

import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

const NOTICE_STYLES = {
    info: {
        color: "#1d4ed8",
        backgroundColor: "#eff6ff",
    },

    warning: {
        color: "#92400e",
        backgroundColor: "#fffbeb",
    },

    danger: {
        color: "#b91c1c",
        backgroundColor: "#fef2f2",
    },
} as const;

const NOTICE_ICONS = {
    info: "ℹ",
    warning: "⚠",
    danger: "!",
} as const;

export function createSecurityNoticeDefinition():
    ReusableComponentDefinition {
    return {
        name: "mf-security-notice",
        version: "1.0.0",
        description: "Security information and alerts",
        allowChildren: false,

        schema: z.object({
            message: z.string().min(1).max(2000),
            severity: z.enum([
                "info",
                "warning",
                "danger",
            ]),
            icon: z.string().min(1).max(4).optional(),
        }).strict(),

        defaults: {
            severity: "info",
        },

        render: (props, context) => {
            const severity = props.severity as
                keyof typeof NOTICE_STYLES;

            return {
                id: context.nodeId,
                type: "section",
                styles: {
                    padding: "0 36px 24px",
                },
                children: [{
                    id: `${context.nodeId}-column`,
                    type: "column",
                    styles: {
                        backgroundColor:
                            NOTICE_STYLES[severity].backgroundColor,
                        padding: "16px 20px",
                    },
                    children: [{
                        id: `${context.nodeId}-message`,
                        type: "text",
                        props: {
                            text: `${String(
                                props.icon ?? NOTICE_ICONS[severity],
                            )} ${severity.toUpperCase()}: ` +
                                String(props.message),
                        },
                        styles: {
                            color: NOTICE_STYLES[severity].color,
                            fontSize: 14,
                            lineHeight: "22px",
                            padding: "0",
                        },
                    }],
                }],
            };
        },
    };
}
