
import {
    EmailLayoutError,
    type EmailLayoutOptions,
    type LayoutAttributes,
    type ResolvedEmailLayout,
} from "./Layout.types.js";

const ROOT_KEYS = new Set([
    "header", "footer", "copyright",
]);

const HEADER_KEYS = new Set([
    "enabled", "title", "logo", "attrs",
]);

const FOOTER_KEYS = new Set([
    "enabled", "message", "supportEmail", "attrs",
]);

const COPYRIGHT_KEYS = new Set([
    "enabled", "text", "year", "attrs",
]);

const ATTRIBUTE_NAME =
    /^(data-[a-z0-9_-]+|aria-[a-z0-9_-]+|id|class|title)$/i;

function record(
    input: unknown,
    path: string,
): Record<string, unknown> {
    if (
        input === null ||
        typeof input !== "object" ||
        Array.isArray(input)
    ) {
        throw new EmailLayoutError(path, "must be an object");
    }

    const proto = Object.getPrototypeOf(input);

    if (proto !== Object.prototype && proto !== null) {
        throw new EmailLayoutError(
            path,
            "must be a plain object",
        );
    }

    return input as Record<string, unknown>;
}

function checkKeys(
    input: Record<string, unknown>,
    allowed: Set<string>,
    path: string,
): void {
    for (const key of Object.keys(input)) {
        if (!allowed.has(key)) {
            throw new EmailLayoutError(
                `${path}.${key}`,
                "unknown option",
            );
        }
    }
}

function textValue(
    input: unknown,
    path: string,
    maxLength = 300,
): string {
    if (
        typeof input !== "string" ||
        !input.trim() ||
        input.length > maxLength ||
        /[\u0000-\u001f\u007f]/.test(input)
    ) {
        throw new EmailLayoutError(
            path,
            "must be valid non-empty text",
        );
    }

    return input.trim();
}

function optionalText(
    input: Record<string, unknown>,
    key: string,
    path: string,
    maxLength?: number,
): string | undefined {
    return Object.hasOwn(input, key)
        ? textValue(
            input[key],
            `${path}.${key}`,
            maxLength,
        )
        : undefined;
}

function enabledValue(
    input: Record<string, unknown>,
    path: string,
): boolean {
    if (!Object.hasOwn(input, "enabled")) {
        return true;
    }

    if (typeof input.enabled !== "boolean") {
        throw new EmailLayoutError(
            `${path}.enabled`,
            "must be a boolean",
        );
    }

    return input.enabled;
}

function httpsUrl(
    input: string,
    path: string,
): string {
    let url: URL;

    try {
        url = new URL(input);
    } catch {
        throw new EmailLayoutError(
            path,
            "must be a valid HTTPS URL",
        );
    }

    if (
        url.protocol !== "https:" ||
        !url.hostname ||
        url.username ||
        url.password
    ) {
        throw new EmailLayoutError(
            path,
            "must be an HTTPS URL without credentials",
        );
    }

    return input;
}

function emailAddress(
    input: string,
    path: string,
): string {
    if (
        input.length > 254 ||
        !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(input)
    ) {
        throw new EmailLayoutError(
            path,
            "must be a valid email address",
        );
    }

    return input;
}

function parseAttrs(
    input: unknown,
    path: string,
): LayoutAttributes {
    const raw = record(input, path);
    const result: LayoutAttributes = {};

    if (Object.keys(raw).length > 50) {
        throw new EmailLayoutError(
            path,
            "too many custom attributes",
        );
    }

    for (const [key, value] of Object.entries(raw)) {
        if (!ATTRIBUTE_NAME.test(key)) {
            throw new EmailLayoutError(
                `${path}.${key}`,
                "unsupported attribute",
            );
        }

        if (
            typeof value !== "string" &&
            typeof value !== "number" &&
            typeof value !== "boolean"
        ) {
            throw new EmailLayoutError(
                `${path}.${key}`,
                "attribute must be string, number or boolean",
            );
        }

        if (
            String(value).length > 1024 ||
            (typeof value === "number" && !Number.isFinite(value)) ||
            /[\u0000-\u001f\u007f]/.test(String(value))
        ) {
            throw new EmailLayoutError(
                `${path}.${key}`,
                "invalid attribute value",
            );
        }

        result[key] = value;
    }

    return result;
}

function section(
    input: Record<string, unknown>,
    key: string,
    keys: Set<string>,
): Record<string, unknown> {
    if (!Object.hasOwn(input, key)) {
        return {};
    }

    const data = record(input[key], key);
    checkKeys(data, keys, key);

    return data;
}

/**
 * Validate layout options and produce complete defaults.
 */
export function resolveEmailLayout(
    input: EmailLayoutOptions = {},
): ResolvedEmailLayout {
    const root = record(input, "layout");
    checkKeys(root, ROOT_KEYS, "layout");

    const header = section(root, "header", HEADER_KEYS);
    const footer = section(root, "footer", FOOTER_KEYS);
    const copyright = section(
        root,
        "copyright",
        COPYRIGHT_KEYS,
    );

    const headerTitle = optionalText(
        header, "title", "header", 120,
    );

    const headerLogo = optionalText(
        header, "logo", "header", 2048,
    );

    const footerMessage = optionalText(
        footer, "message", "footer", 300,
    );

    const footerEmail = optionalText(
        footer, "supportEmail", "footer", 254,
    );

    const copyrightText = optionalText(
        copyright, "text", "copyright", 500,
    );

    const year = Object.hasOwn(copyright, "year")
        ? copyright.year
        : "auto";

    if (
        year !== "auto" &&
        (
            typeof year !== "number" ||
            !Number.isInteger(year) ||
            year < 1900 ||
            year > 2100
        )
    ) {
        throw new EmailLayoutError(
            "copyright.year",
            "must be auto or a year between 1900 and 2100",
        );
    }

    const value: ResolvedEmailLayout = {
        header: {
            enabled: enabledValue(header, "header"),
            ...(headerTitle !== undefined
                ? { title: headerTitle }
                : {}),
            ...(headerLogo !== undefined
                ? {
                    logo: httpsUrl(
                        headerLogo, "header.logo",
                    ),
                }
                : {}),
            attrs: Object.freeze(
                Object.hasOwn(header, "attrs")
                    ? parseAttrs(header.attrs, "header.attrs")
                    : {},
            ),
        },

        footer: {
            enabled: enabledValue(footer, "footer"),
            ...(footerMessage !== undefined
                ? { message: footerMessage }
                : {}),
            ...(footerEmail !== undefined
                ? {
                    supportEmail: emailAddress(
                        footerEmail,
                        "footer.supportEmail",
                    ),
                }
                : {}),
            attrs: Object.freeze(
                Object.hasOwn(footer, "attrs")
                    ? parseAttrs(footer.attrs, "footer.attrs")
                    : {},
            ),
        },

        copyright: {
            enabled: enabledValue(copyright, "copyright"),
            text: copyrightText ??
                "© {year} {brand}. All rights reserved.",
            year: year as number | "auto",
            attrs: Object.freeze(
                Object.hasOwn(copyright, "attrs")
                    ? parseAttrs(
                        copyright.attrs,
                        "copyright.attrs",
                    )
                    : {},
            ),
        },
    };

    return Object.freeze({
        header: Object.freeze(value.header),
        footer: Object.freeze(value.footer),
        copyright: Object.freeze(value.copyright),
    });
}

/**
 * Apply one-email overrides without changing
 * the original global configuration.
 */
export function mergeEmailLayout(
    base: ResolvedEmailLayout,
    overrides: EmailLayoutOptions = {},
): ResolvedEmailLayout {
    const raw = record(overrides, "layout");
    checkKeys(raw, ROOT_KEYS, "layout");

    const header = section(raw, "header", HEADER_KEYS);
    const footer = section(raw, "footer", FOOTER_KEYS);
    const copyright = section(
        raw, "copyright", COPYRIGHT_KEYS,
    );

    return resolveEmailLayout({
        header: {
            ...base.header,
            ...header,
            attrs: {
                ...base.header.attrs,
                ...(Object.hasOwn(header, "attrs")
                    ? parseAttrs(header.attrs, "header.attrs")
                    : {}),
            },
        },

        footer: {
            ...base.footer,
            ...footer,
            attrs: {
                ...base.footer.attrs,
                ...(Object.hasOwn(footer, "attrs")
                    ? parseAttrs(footer.attrs, "footer.attrs")
                    : {}),
            },
        },

        copyright: {
            ...base.copyright,
            ...copyright,
            attrs: {
                ...base.copyright.attrs,
                ...(Object.hasOwn(copyright, "attrs")
                    ? parseAttrs(
                        copyright.attrs,
                        "copyright.attrs",
                    )
                    : {}),
            },
        },
    });
}
