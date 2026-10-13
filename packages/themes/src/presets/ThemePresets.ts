import type { ResolvedEmailTheme, ThemePreset } from "../contracts/Theme.types.js";
import { modernTheme } from "../default/modern.js";
import { minimalTheme } from "../minimal/minimal.js";
import { corporateTheme } from "../corporate/corporate.js";
import { PROFESSIONAL_THEMES } from "./ProfessionalThemes.js";

export const THEME_PRESET_NAMES = ["modern", "minimal", "corporate", "dark", "premium", "ocean", "forest", "sunset", "elegant", "playful"] as const;
const PRESETS: Record<ThemePreset, ResolvedEmailTheme> = {
    modern: modernTheme,
    minimal: minimalTheme,
    corporate: corporateTheme,
    ...PROFESSIONAL_THEMES,
};

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

