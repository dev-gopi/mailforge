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
export { ThemeVersionRegistry } from "./registry/ThemeVersionRegistry.js";
export type { ThemeVersionInfo } from "./registry/ThemeVersionRegistry.js";

// Theme catalog and accessibility diagnostics
export { listThemeCatalog, getContrastRatio, auditThemeContrast } from "./catalog/ThemeCatalog.js";
export type { ThemeCatalogEntry, ThemeContrastFinding } from "./catalog/ThemeCatalog.js";

// Dedicated theme presets
export { darkTheme, getDarkTheme } from "./dark/theme.js";

