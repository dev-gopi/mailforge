/** Framework-independent, email-safe theme contract and preset library. */
export { EmailThemeError } from "./contracts/Theme.types.js";
export type {
    ThemePreset, ThemeColors, ThemeTypography, ThemeSpacing, ThemeAppearance,
    ThemeOverrides, ThemeConfiguration, EmailThemeOptions, ResolvedEmailTheme,
} from "./contracts/Theme.types.js";
export {
    THEME_PRESET_NAMES, getThemePreset, listThemePresets,
} from "./presets/ThemePresets.js";
export {
    resolveEmailTheme, mergeEmailTheme, defineThemeOverrides,
} from "./resolver/ThemeResolver.js";
export { ThemeRegistry } from "./registry/ThemeRegistry.js";
export type { ThemeDefinition, ThemeImportOptions } from "./registry/ThemeRegistry.js";
