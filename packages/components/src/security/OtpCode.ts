
import { z } from "zod";

import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

/**
 * Displays a verification code.
 *
 * The schema accepts a string so the existing
 * registration-time variable preview works.
 *
 * Numeric format is enforced by the handler
 * AFTER actual variable interpolation.
 */
export function createOtpCodeDefinition():
    ReusableComponentDefinition {
    return {
        name: "mf-otp-code",
        version: "1.0.0",
        description: "One-time verification code",
        allowChildren: false,

        schema: z.object({
            code: z.string().min(1).max(64),
        }).strict(),

        render: (props, context) => {
            const code = String(props.code);

            if (!/^[0-9]{4,10}$/.test(code)) {
                throw new Error(
                    "OTP code must contain 4 to 10 digits",
                );
            }

            return {
                id: context.nodeId,
                type: "heading",

                props: {
                    text: code,
                    level: 2,
                },

                styles: {
                    textAlign: "center",
                    fontSize: 30,
                    fontWeight: "bold",
                    padding: "16px",
                },
            };
        },
    };
}
