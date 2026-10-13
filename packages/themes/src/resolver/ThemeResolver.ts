
import {
    getThemePreset,
    THEME_PRESET_NAMES,
} from "../presets/ThemePresets.js";

import {
    EmailThemeError,
    type ResolvedEmailTheme,
    type ThemeColors,
    type ThemeAppearance,
    type ThemeOverrides,
    type ThemePreset,
    type ThemeSpacing,
    type ThemeTypography,
} from "../contracts/Theme.types.js";

const ROOT_KEYS = new Set([
    "preset",
    "colors",
    "typography",
    "spacing",
    "appearance",
]);

const OVERRIDE_KEYS = new Set([
    "colors",
    "typography",
    "spacing",
    "appearance",
]);

const APPEARANCE_KEYS = new Set(["containerWidth", "contentPadding", "cardRadius", "buttonRadius", "cardPadding", "buttonPaddingY", "buttonPaddingX"]);

const COLOR_KEYS = [
    "primary",
    "secondary",
    "accent",
    "success",
    "warning",
    "danger",
    "background",
    "surface",
    "section",
    "text",
    "muted",
    "border",
] as const;

const TYPOGRAPHY_KEYS = new Set([
    "fontFamily",
    "headingFontFamily",
    "baseSize",
    "headingSize",
    "lineHeight",
]);

const SPACING_KEYS = [
    "xs",
    "sm",
    "md",
    "lg",
    "xl",
] as const;

/**
 * Accept only plain objects.
 */
function asRecord(
    input: unknown,
    field: string,
): Record<string, unknown> {
    if (
        typeof input !== "object" ||
        input === null ||
        Array.isArray(input)
    ) {
        throw new EmailThemeError(
            field,
            "must be an object",
        );
    }

    const prototype = Object.getPrototypeOf(input);

    if (
        prototype !== Object.prototype &&
        prototype !== null
    ) {
        throw new EmailThemeError(
            field,
            "must be a plain object",
        );
    }

    return input as Record<string, unknown>;
}

/**
 * Reject misspelled or unsupported tokens.
 */
function allowOnly(
    input: Record<string, unknown>,
    allowed: ReadonlySet<string>,
    path: string,
): void {
    for (const key of Object.keys(input)) {
        if (!allowed.has(key)) {
            throw new EmailThemeError(
                `${path}.${key}`,
                "unknown theme option",
            );
        }
    }
}

/**
 * Accept only six-digit HEX colors.
 */
function checkColor(
    value: unknown,
    path: string,
): string {
    if (
        typeof value !== "string" ||
        !/^#[0-9a-fA-F]{6}$/.test(value)
    ) {
        throw new EmailThemeError(
            path,
            "must be a six-digit HEX color",
        );
    }

    return value.toLowerCase();
}

/**
 * Restrict font-family tokens to simple,
 * predictable font stacks.
 */
function checkFontFamily(
    value: unknown,
    path: string,
): string {
    if (typeof value !== "string") {
        throw new EmailThemeError(
            path,
            "must be a string",
        );
    }

    const font = value.trim();

    if (
        font.length === 0 ||
        font.length > 160 ||
        !/^[a-zA-Z0-9 ,'"-]+$/.test(font)
    ) {
        throw new EmailThemeError(
            path,
            "contains an unsupported font-family value",
        );
    }

    return font;
}

function checkNumber(
    value: unknown,
    path: string,
    min: number,
    max: number,
    integer = false,
): number {
    if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < min ||
        value > max ||
        (integer && !Number.isInteger(value))
    ) {
        throw new EmailThemeError(
            path,
            `must be a number between ${min} and ${max}` +
            (integer ? " (integer only)" : ""),
        );
    }

    return value;
}

/**
 * Validate partial color overrides.
 */
function parseColors(
    input: unknown,
): Partial<ThemeColors> {
    const raw = asRecord(input, "theme.colors");

    allowOnly(
        raw,
        new Set(COLOR_KEYS),
        "theme.colors",
    );

    const colors: Partial<ThemeColors> = {};

    for (const key of COLOR_KEYS) {
        if (Object.hasOwn(raw, key)) {
            colors[key] = checkColor(
                raw[key],
                `theme.colors.${key}`,
            );
        }
    }

    return colors;
}

/**
 * Validate partial typography overrides.
 */
function parseTypography(
    input: unknown,
): Partial<ThemeTypography> {
    const raw = asRecord(
        input,
        "theme.typography",
    );

    allowOnly(
        raw,
        TYPOGRAPHY_KEYS,
        "theme.typography",
    );

    const result: Partial<ThemeTypography> = {};

    if (Object.hasOwn(raw, "fontFamily")) {
        result.fontFamily = checkFontFamily(
            raw.fontFamily,
            "theme.typography.fontFamily",
        );
    }

    if (Object.hasOwn(raw, "headingFontFamily")) {
        result.headingFontFamily = checkFontFamily(
            raw.headingFontFamily,
            "theme.typography.headingFontFamily",
        );
    }

    if (Object.hasOwn(raw, "baseSize")) {
        result.baseSize = checkNumber(
            raw.baseSize,
            "theme.typography.baseSize",
            10,
            28,
            true,
        );
    }

    if (Object.hasOwn(raw, "headingSize")) {
        result.headingSize = checkNumber(
            raw.headingSize,
            "theme.typography.headingSize",
            14,
            56,
            true,
        );
    }

    if (Object.hasOwn(raw, "lineHeight")) {
        result.lineHeight = checkNumber(
            raw.lineHeight,
            "theme.typography.lineHeight",
            1,
            2.5,
        );
    }

    return result;
}

/**
 * Validate partial spacing overrides.
 */
function parseSpacing(
    input: unknown,
): Partial<ThemeSpacing> {
    const raw = asRecord(input, "theme.spacing");

    allowOnly(
        raw,
        new Set(SPACING_KEYS),
        "theme.spacing",
    );

    const result: Partial<ThemeSpacing> = {};

    for (const key of SPACING_KEYS) {
        if (Object.hasOwn(raw, key)) {
            result[key] = checkNumber(
                raw[key],
                `theme.spacing.${key}`,
                0,
                96,
                true,
            );
        }
    }

    return result;
}

/** Appearance dimensions are deliberately bounded for email clients. */
function parseAppearance(input: unknown): Partial<ThemeAppearance> {
    const raw = asRecord(input, "theme.appearance");
    allowOnly(raw, APPEARANCE_KEYS, "theme.appearance");
    const result: Partial<ThemeAppearance> = {};
    for (const key of APPEARANCE_KEYS) {
        if (!Object.hasOwn(raw, key)) continue;
        const limits: Record<keyof ThemeAppearance, [number, number]> = {
            containerWidth: [480, 720],
            contentPadding: [16, 56],
            cardRadius: [0, 24],
            buttonRadius: [0, 24],
            cardPadding: [8, 48],
            buttonPaddingY: [8, 32],
            buttonPaddingX: [8, 48],
        };
        const name = key as keyof ThemeAppearance;
        const [min, max] = limits[name];
        result[name] = checkNumber(raw[key], `theme.appearance.${key}`, min, max, true);
    }
    return result;
}

/**
 * Freeze nested theme objects as well.
 */
function freezeTheme(
    theme: ResolvedEmailTheme,
): ResolvedEmailTheme {
    return Object.freeze({
        preset: theme.preset,
        colors: Object.freeze({ ...theme.colors }),
        typography: Object.freeze({
            ...theme.typography,
        }),
        spacing: Object.freeze({
            ...theme.spacing,
        }),
        appearance: Object.freeze({ ...theme.appearance }),
    });
}

/**
 * Merge a complete theme with partial overrides.
 *
 * Returns a new theme; never changes the base.
 */
export function mergeEmailTheme(
    base: ResolvedEmailTheme,
    input: unknown = {},
): ResolvedEmailTheme {
    const overrides = asRecord(
        input,
        "theme",
    );

    allowOnly(
        overrides,
        OVERRIDE_KEYS,
        "theme",
    );

    const colors = Object.hasOwn(overrides, "colors")
        ? parseColors(overrides.colors)
        : {};

    const typography = Object.hasOwn(
        overrides,
        "typography",
    )
        ? parseTypography(overrides.typography)
        : {};

    const spacing = Object.hasOwn(overrides, "spacing")
        ? parseSpacing(overrides.spacing)
        : {};

    const appearance = Object.hasOwn(overrides, "appearance")
        ? parseAppearance(overrides.appearance)
        : {};

    const mergedSpacing: ThemeSpacing = {
        ...base.spacing,
        ...spacing,
    };

    const ordered = SPACING_KEYS.map(
        (key) => mergedSpacing[key],
    );

    for (let index = 1; index < ordered.length; index++) {
        const previous = ordered[index - 1];
        const current = ordered[index];

        if (
            previous !== undefined &&
            current !== undefined &&
            current < previous
        ) {
            throw new EmailThemeError(
                "theme.spacing",
                "spacing must increase or stay equal " +
                "from xs to xl",
            );
        }
    }

    return freezeTheme({
        preset: base.preset,
        colors: {
            ...base.colors,
            ...colors,
        },
        typography: {
            ...base.typography,
            ...typography,
        },
        spacing: mergedSpacing,
        appearance: { ...base.appearance, ...appearance },
    });
}

/**
 * Resolve a preset or custom theme configuration.
 *
 * Precedence:
 * 1. Built-in preset
 * 2. Explicit company primary color
 * 3. Explicit theme overrides
 */
export function resolveEmailTheme(
    input: unknown = "modern",
    brandPrimaryColor?: string,
): ResolvedEmailTheme {
    const raw = typeof input === "string"
        ? { preset: input }
        : asRecord(input, "theme");

    allowOnly(raw, ROOT_KEYS, "theme");

    const presetName = raw.preset ?? "modern";

    if (
        typeof presetName !== "string" ||
        !THEME_PRESET_NAMES.includes(
            presetName as ThemePreset,
        )
    ) {
        throw new EmailThemeError(
            "theme.preset",
            "must be modern, minimal, or corporate",
        );
    }

    const preset = presetName as ThemePreset;
    const base = getThemePreset(preset);

    const adjustedBase: ResolvedEmailTheme = {
        ...base,
        colors: {
            ...base.colors,
            ...(brandPrimaryColor !== undefined
                ? {
                    primary: checkColor(
                        brandPrimaryColor,
                        "brand.primaryColor",
                    ),
                }
                : {}),
        },
    };

    const overrides: Record<string, unknown> = {};

    for (const key of OVERRIDE_KEYS) {
        if (Object.hasOwn(raw, key)) {
            overrides[key] = raw[key];
        }
    }

    return mergeEmailTheme(adjustedBase, overrides);
}

/**
 * Compile-time helper for custom overrides.
 */
export function defineThemeOverrides(
    overrides: ThemeOverrides,
): ThemeOverrides {
    return overrides;
}
