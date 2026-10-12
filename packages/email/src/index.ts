
export {
    createEmail,
    MailForgeEmail,
} from "./createEmail.js";

export type {
    TemplateRenderOptions,
} from "./createEmail.js";

// Branding configuration
export {
    EmailConfigError,
} from "./config/EmailConfig.js";

export {
    resolveEmailConfig,
} from "./config/ConfigResolver.js";

export type {
    EmailBrandOptions,
    EmailConfigOptions,
    ResolvedEmailBrand,
    ResolvedEmailConfig,
} from "./config/EmailConfig.js";

// Theme management
export {
    EmailThemeError,
} from "./theme/Theme.types.js";

export {
    getThemePreset,
    listThemePresets,
} from "./theme/ThemePresets.js";

export {
    resolveEmailTheme,
    mergeEmailTheme,
    defineThemeOverrides,
} from "./theme/ThemeResolver.js";

export type {
    ThemePreset,
    ThemeColors,
    ThemeTypography,
    ThemeSpacing,
    ThemeOverrides,
    ThemeConfiguration,
    EmailThemeOptions,
    ResolvedEmailTheme,
} from "./theme/Theme.types.js";

// Existing core types
export type {
    EmailDocument,
    EmailNode,
    DocumentPatch,
    RenderOptions,
    RenderResult,
} from "@mailforge/core";

// Existing HTML renderer input
export type {
    HtmlRenderInput,
} from "@mailforge/renderer-html";
