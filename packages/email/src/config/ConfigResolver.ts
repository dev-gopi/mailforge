
import {
    EmailConfigError,
    type EmailConfigOptions,
    type ResolvedEmailBrand,
    type ResolvedEmailConfig,
} from "./EmailConfig.js";

const DEFAULT_NAME = "MailForge";
const DEFAULT_COLOR = "#2563eb";

const CONFIG_KEYS = new Set(["brand"]);

const BRAND_KEYS = new Set([
    "name",
    "logo",
    "website",
    "primaryColor",
    "supportEmail",
]);

const hasControlCharacter = (value: string): boolean =>
    [...value].some((character) => {
        const code = character.charCodeAt(0);

        return code <= 0x1f || code === 0x7f;
    });

/**
 * Accept ordinary objects, not arrays or class instances.
 */
function asRecord(
    value: unknown,
    field: string,
): Record<string, unknown> {
    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value)
    ) {
        throw new EmailConfigError(
            field,
            "must be an object",
        );
    }

    const proto = Object.getPrototypeOf(value);

    if (
        proto !== Object.prototype &&
        proto !== null
    ) {
        throw new EmailConfigError(
            field,
            "must be a plain object",
        );
    }

    return value as Record<string, unknown>;
}

/**
 * Reject unknown settings to catch spelling errors.
 */
function allowOnly(
    value: Record<string, unknown>,
    allowed: Set<string>,
    field: string,
): void {
    for (const key of Object.keys(value)) {
        if (!allowed.has(key)) {
            throw new EmailConfigError(
                field ? `${field}.${key}` : key,
                "unknown option",
            );
        }
    }
}

/**
 * Read and validate an optional string.
 */
function readString(
    data: Record<string, unknown>,
    key: string,
    maxLength: number,
): string | undefined {
    if (!Object.hasOwn(data, key)) {
        return undefined;
    }

    const value = data[key];

    if (typeof value !== "string") {
        throw new EmailConfigError(
            `brand.${key}`,
            "must be a string",
        );
    }

    const clean = value.trim();

    if (clean.length === 0) {
        throw new EmailConfigError(
            `brand.${key}`,
            "cannot be empty",
        );
    }

    if (clean.length > maxLength) {
        throw new EmailConfigError(
            `brand.${key}`,
            `must be at most ${maxLength} characters`,
        );
    }

    if (hasControlCharacter(clean)) {
        throw new EmailConfigError(
            `brand.${key}`,
            "must not contain control characters",
        );
    }

    return clean;
}

/**
 * Validate HTTPS brand asset/website URLs.
 *
 * This function does not fetch remote resources.
 */
function checkHttps(
    value: string,
    field: string,
): string {
    let url: URL;

    try {
        url = new URL(value);
    } catch {
        throw new EmailConfigError(
            field,
            "must be a valid HTTPS URL",
        );
    }

    if (
        url.protocol !== "https:" ||
        !url.hostname ||
        url.username ||
        url.password
    ) {
        throw new EmailConfigError(
            field,
            "must be an HTTPS URL without credentials",
        );
    }

    return value;
}

/**
 * Normalize and validate the complete configuration.
 */
export function resolveEmailConfig(
    input: EmailConfigOptions = {},
): ResolvedEmailConfig {
    const options = asRecord(input, "config");

    allowOnly(options, CONFIG_KEYS, "config");

    const rawBrand = Object.hasOwn(options, "brand")
        ? asRecord(options.brand, "brand")
        : {};

    allowOnly(rawBrand, BRAND_KEYS, "brand");

    const name =
        readString(rawBrand, "name", 120) ??
        DEFAULT_NAME;

    const primaryColor = (
        readString(rawBrand, "primaryColor", 7) ??
        DEFAULT_COLOR
    ).toLowerCase();

    if (!/^#[a-f0-9]{6}$/.test(primaryColor)) {
        throw new EmailConfigError(
            "brand.primaryColor",
            "must be a six-digit HEX color such as #2563eb",
        );
    }

    const logo = readString(
        rawBrand,
        "logo",
        2048,
    );

    const website = readString(
        rawBrand,
        "website",
        2048,
    );

    const supportEmail = readString(
        rawBrand,
        "supportEmail",
        254,
    );

    if (
        supportEmail !== undefined &&
        !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(
            supportEmail,
        )
    ) {
        throw new EmailConfigError(
            "brand.supportEmail",
            "must be a valid email address",
        );
    }

    const brand: ResolvedEmailBrand = {
        name,
        primaryColor,

        ...(logo !== undefined
            ? { logo: checkHttps(logo, "brand.logo") }
            : {}),

        ...(website !== undefined
            ? {
                website: checkHttps(
                    website,
                    "brand.website",
                ),
            }
            : {}),

        ...(supportEmail !== undefined
            ? { supportEmail }
            : {}),
    };

    // The stored configuration cannot be mutated.
    return Object.freeze({
        brand: Object.freeze(brand),
    });
}
