import { getThemePreset, listThemePresets } from "../presets/ThemePresets.js";
import type { ResolvedEmailTheme, ThemePreset } from "../contracts/Theme.types.js";

export interface ThemeCatalogEntry {
    readonly name: ThemePreset;
    readonly label: string;
    readonly description: string;
    readonly primary: string;
    readonly surface: string;
    readonly background: string;
    readonly text: string;
}

export interface ThemeContrastFinding {
    readonly pair: "text/surface" | "muted/surface" | "text/background";
    readonly ratio: number;
    readonly minimum: number;
    readonly passes: boolean;
}

const DETAILS: Record<ThemePreset, { label: string; description: string }> = {
    modern: { label: "Modern", description: "Balanced transactional email styling" },
    corporate: { label: "Corporate", description: "Professional business correspondence" },
    minimal: { label: "Minimal", description: "Typographic, understated content" },
};

/** Metadata is derived from the actual presets, never duplicated theme definitions. */
export function listThemeCatalog(): ThemeCatalogEntry[] {
    return listThemePresets().map(name => {
        const theme = getThemePreset(name);
        return Object.freeze({
            name,
            ...DETAILS[name],
            primary: theme.colors.primary,
            surface: theme.colors.surface,
            background: theme.colors.background,
            text: theme.colors.text,
        });
    });
}

function relativeLuminance(hex: string): number {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
        throw new Error("Contrast colors must be six-digit HEX values");
    }
    const [r, g, b] = [1, 3, 5].map(offset => {
        const c = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function getContrastRatio(foreground: string, background: string): number {
    const a = relativeLuminance(foreground);
    const b = relativeLuminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Diagnostic only: custom branded themes are not silently modified. */
export function auditThemeContrast(theme: ResolvedEmailTheme): ThemeContrastFinding[] {
    return ([
        ["text/surface", theme.colors.text, theme.colors.surface],
        ["muted/surface", theme.colors.muted, theme.colors.surface],
        ["text/background", theme.colors.text, theme.colors.background],
    ] as const).map(([pair, foreground, background]) => {
        const ratio = getContrastRatio(foreground, background);
        return { pair, ratio, minimum: 4.5, passes: ratio >= 4.5 };
    });
}
