
import { z } from "zod";

function text(max: number) {
    return z.string()
        .min(1)
        .max(max)
        .refine(
            value =>
                value.trim().length > 0 &&
                !/[\u0000-\u001f\u007f]/.test(value),
            "Must contain valid non-empty text",
        );
}

const httpsUrl = text(2048).refine(value => {
    try {
        const url = new URL(value);

        return (
            url.protocol === "https:" &&
            url.hostname.length > 0 &&
            url.username.length === 0 &&
            url.password.length === 0
        );
    } catch {
        return false;
    }
}, "Must be HTTPS without credentials");

const expiration = z.number()
    .int()
    .min(1)
    .max(60);

export const LEGACY_TEMPLATE_SCHEMAS = {
    welcome: z.object({
        user: z.object({
            firstName: text(80),
        }).loose(),

        actionUrl: httpsUrl,
    }).loose(),

    otp: z.object({
        code: z.string().regex(
            /^[0-9]{4,10}$/,
            "OTP must contain 4 to 10 digits",
        ),
        expiresInMinutes: expiration,
    }).loose(),

    "password-reset": z.object({
        user: z.object({
            firstName: text(80),
        }).loose(),

        resetUrl: httpsUrl,
        expiresInMinutes: expiration,
    }).loose(),

    invitation: z.object({
        invitee: z.object({
            firstName: text(80),
        }).loose(),

        inviterName: text(120),
        organizationName: text(120),
        inviteUrl: httpsUrl,
    }).loose(),

    notification: z.object({
        title: text(140),
        message: text(2000),
        actionUrl: httpsUrl,
    }).loose(),
} as const;
