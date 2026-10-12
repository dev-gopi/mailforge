
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
        }).strict(),

        defaults: {
            severity: "info",
        },

        render: (props, context) => {
            const severity = props.severity as
                keyof typeof NOTICE_STYLES;

            return {
                id: context.nodeId,
                type: "text",

                props: {
                    text: `${severity.toUpperCase()}: ` +
                        String(props.message),
                },

                styles: {
                    ...NOTICE_STYLES[severity],
                    padding: "12px",
                    fontSize: 14,
                },
            };
        },
    };
}
