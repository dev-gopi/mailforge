
import type {
    ResolvedEmailTheme,
    ThemePreset,
} from "./Theme.types.js";

export const THEME_PRESET_NAMES = [
    "modern",
    "minimal",
    "corporate",
] as const;

/**
 * Built-in design presets.
 *
 * These objects are internal definitions.
 * getThemePreset() returns a separate copy.
 */
const PRESETS: Record<
    ThemePreset,
    ResolvedEmailTheme
> = {
    modern: {
        preset: "modern",

        colors: {
            primary: "#2563eb",
            secondary: "#475569",
            accent: "#dbeafe",
            background: "#f5f6f8",
            surface: "#ffffff",
            section: "#eff6ff",
            text: "#0f172a",
            muted: "#64748b",
            border: "#e5e7eb",
        },

        typography: {
            fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif",
            headingFontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif",
            baseSize: 14,
            headingSize: 28,
            lineHeight: 1.5,
        },

        appearance: { containerWidth: 600, contentPadding: 32, cardRadius: 12, buttonRadius: 8 },

        spacing: {
            xs: 4,
            sm: 8,
            md: 16,
            lg: 24,
            xl: 32,
        },
    },

    minimal: {
        preset: "minimal",
        appearance: { containerWidth: 600, contentPadding: 30, cardRadius: 4, buttonRadius: 4 },

        colors: {
            primary: "#111827",
            secondary: "#4b5563",
            accent: "#e5e7eb",
            background: "#ffffff",
            surface: "#ffffff",
            section: "#f9fafb",
            text: "#111827",
            muted: "#6b7280",
            border: "#e5e7eb",
        },

        typography: {
            fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif",
            headingFontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif",
            baseSize: 14,
            headingSize: 24,
            lineHeight: 1.5,
        },

        spacing: {
            xs: 4,
            sm: 8,
            md: 14,
            lg: 20,
            xl: 28,
        },
    },

    corporate: {
        preset: "corporate",
        appearance: { containerWidth: 600, contentPadding: 36, cardRadius: 10, buttonRadius: 6 },

        colors: {
            primary: "#0f4c81",
            secondary: "#334155",
            accent: "#dbeafe",
            background: "#f8fafc",
            surface: "#ffffff",
            section: "#f1f5f9",
            text: "#0f172a",
            muted: "#64748b",
            border: "#cbd5e1",
        },

        typography: {
            fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif",
            headingFontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif",
            baseSize: 15,
            headingSize: 28,
            lineHeight: 1.5,
        },

        spacing: {
            xs: 4,
            sm: 10,
            md: 18,
            lg: 28,
            xl: 40,
        },
    },
};

/**
 * Return a separate copy of a preset
 * to prevent accidental shared mutation.
 */
export function getThemePreset(
    name: ThemePreset,
): ResolvedEmailTheme {
    const preset = PRESETS[name];

    if (!preset) {
        throw new Error(
            `Unknown theme preset: ${name}`,
        );
    }

    return structuredClone(preset);
}

/**
 * List supported built-in theme names.
 */
export function listThemePresets(): ThemePreset[] {
    return [...THEME_PRESET_NAMES];
}
