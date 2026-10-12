
import { z } from "zod";

/**
 * URLs for transactional email actions and
 * remote image assets must use HTTPS.
 */
export function isSafeHttpsUrl(value: string): boolean {
    try {
        const url = new URL(value);

        return (
            url.protocol === "https:" &&
            url.hostname.length > 0 &&
            url.username.length === 0 &&
            url.password.length === 0 &&
            value.length <= 2048 &&
            !/\p{Cc}/u.test(value)
        );
    } catch {
        return false;
    }
}

export const httpsUrlSchema = z.url().refine(
    isSafeHttpsUrl,
    "URL must use HTTPS without credentials",
);

export const hexColorSchema = z.string().regex(
    /^#[0-9a-fA-F]{6}$/,
    "Color must be a six-digit HEX value",
);
