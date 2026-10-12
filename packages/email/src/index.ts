
export {
  createEmail,
  MailForgeEmail,
} from "./createEmail.js";

export type {
  TemplateRenderOptions,
} from "./createEmail.js";

// Brand and configuration
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

// Themes
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

// Automatic layouts
export {
  EmailLayoutError,
} from "./layout/Layout.types.js";

export {
  resolveEmailLayout,
  mergeEmailLayout,
} from "./layout/LayoutResolver.js";

export {
  applyDefaultLayout,
} from "./layout/DefaultLayout.js";

export {
  applyEmailTheme,
} from "./layout/ThemeApplicator.js";

export type {
  EmailLayoutOptions,
  HeaderOptions,
  FooterOptions,
  CopyrightOptions,
  LayoutAttributes,
  ResolvedHeader,
  ResolvedFooter,
  ResolvedCopyright,
  ResolvedEmailLayout,
} from "./layout/Layout.types.js";

// Core public types
export type {
  EmailDocument,
  EmailNode,
  DocumentPatch,
  RenderOptions,
  RenderResult,
} from "@mailforge/core";

// HTML renderer
export type {
  HtmlRenderInput,
} from "@mailforge/renderer-html";
