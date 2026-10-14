export {
    createEmail,
    MailForgeEmail,
} from "./createEmail.js";

export type {
    TemplateRenderOptions,
} from "./createEmail.js";

// Generic, validated per-render overrides for every built-in and custom document.
export { applyDocumentOverrides, EmailDocumentOverrideError } from "@mailforge/core";
export type { EmailDocumentOverrides, EmailNodeOverrides } from "@mailforge/core";

// Branding and global configuration
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
    getThemePreset,
    listThemePresets,
    resolveEmailTheme,
    mergeEmailTheme,
    defineThemeOverrides,
} from "@mailforge/themes";

export type {
    ThemePreset,
    ThemeColors,
    ThemeTypography,
    ThemeSpacing,
    ThemeAppearance,
    ThemeOverrides,
    ThemeConfiguration,
    EmailThemeOptions,
    ResolvedEmailTheme,
} from "@mailforge/themes";

// Layouts
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

// Optional, email-safe visual layout presets.
export {
    getLayoutPreset,
    listLayoutPresets,
    EmailLayoutPresetError,
} from "./layout/LayoutPresets.js";
export type {
    LayoutPresetName,
    LayoutPresetDefinition,
} from "./layout/LayoutPresets.js";

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

// Dynamic variables
export {
    EmailVariableError,
} from "./variables/Variable.types.js";

export {
    prepareTemplateForValidation,
    interpolateEmailDocument,
    interpolateDocumentPatches,
} from "./variables/VariableResolver.js";

export type {
    TemplateData,
    VariableIssue,
    VariableErrorCode,
} from "./variables/Variable.types.js";

// Existing core types
export type {
    EmailDocument,
    EmailNode,
    DocumentPatch,
    RenderOptions,
    RenderResult,
} from "@mailforge/core";

// Standalone HTML renderer
export type {
    HtmlRenderInput,
} from "@mailforge/renderer-html";

export { buildReportReadyTemplate, reportReadySchema, reportReadyPreviewData } from "@mailforge/templates";
export type { ReportReadyData } from "@mailforge/templates";
export { buildActivityNotificationTemplate, activityNotificationSchema, activityNotificationPreviewData } from "@mailforge/templates";
export type { ActivityNotificationData } from "@mailforge/templates";
export { buildPasswordResetSecureTemplate, passwordResetSecureSchema, passwordResetSecurePreviewData } from "@mailforge/templates";
export type { PasswordResetSecureData } from "@mailforge/templates";
// Built-in email templates
export {
    getBuiltinTemplate,
    listBuiltinTemplates,
    isBuiltinTemplateName,
    assertBuiltinTemplateData,
    BuiltinTemplateDataError,
} from "@mailforge/templates";

export type {
    BuiltinTemplateName,
    BuiltinTemplateDataMap,
} from "@mailforge/templates";

// Public custom-component API (implementation lives in @mailforge/components).
export {
    ComponentCatalog,
    ComponentExpander,
    ComponentCatalogError,
    ComponentRenderError,
} from "@mailforge/components";

export type {
    ReusableComponentDefinition,
    ComponentRenderContext,
    ComponentRenderOutput,
    ComponentRenderHandler,
} from "@mailforge/components";

export {
    STANDARD_COMPONENT_NAMES,
    getStandardComponentDefinitions,
} from "@mailforge/components";

export {
    COMPOSITE_COMPONENT_NAMES,
    getCompositeComponentDefinitions,
} from "@mailforge/components";

export {
    DOMAIN_TEMPLATE_NAMES,
    buildDomainTemplate,
    parseDomainTemplateData,
    TemplateContractRegistry,
} from "@mailforge/templates";

export type {
    DomainTemplateName,
    DomainTemplateDataMap,
    ParsedDomainTemplateDataMap,
    TemplateContractDefinition,
    TemplateContractField,
    TemplateFieldType,
} from "@mailforge/templates";

export {
    EmailRenderBudgetError,
    assertRenderBudget,
} from "./security/RenderGuard.js";

// Template presets and reusable theme profiles.
export {
    TemplatePresetRegistry,
    ThemeProfileRegistry,
} from "./presets/PresetRegistry.js";

export {
    TemplatePresetError,
} from "./presets/Preset.types.js";

export type {
    TemplatePresetDefinition,
    TemplatePresetInfo,
    TemplateCustomizer,
} from "./presets/Preset.types.js";

export type {
    ValidatedBuiltinTemplateDataMap,
} from "@mailforge/templates";

// Extended reusable components
export {
    EXTENDED_COMPONENT_NAMES,
    getExtendedComponentDefinitions,
    registerExtendedComponents,
    registerAllComponents,
    createCalloutBoxDefinition,
    createKeyValueListDefinition,
    createDividerWithTextDefinition,
    createSocialLinksDefinition,
    createBrandHeaderDefinition,
    createStatusCardDefinition,
    createFullWidthButtonDefinition,
    createLegalFooterDefinition,
    MARKETING_COMPONENT_NAMES,
    getMarketingComponentDefinitions,
    registerMarketingComponents,
} from "@mailforge/components";

// Extended domain templates
export {
    EXTENDED_TEMPLATE_NAMES,
    listExtendedTemplates,
    getExtendedTemplateInfo,
    getExtendedTemplate,
    registerExtendedTemplates,
    buildNewsletterTemplate,
    buildPromotionTemplate,
    buildShippingUpdateTemplate,
} from "@mailforge/templates";

export type {
    ExtendedTemplateName,
    ExtendedTemplateDataMap,
    ExtendedTemplateInfo,
    NewsletterData,
    PromotionData,
    ShippingUpdateData,
} from "@mailforge/templates";

export {
    buildFeatureShowcaseTemplate,
    featureShowcaseSchema,
} from "@mailforge/templates";

export type {
    FeatureShowcaseData,
} from "@mailforge/templates";


// Per-render display customization (headers, headings, buttons, IDs and subject)
export { applyTemplateDisplay, TemplateDisplayError } from "./layout/TemplateDisplay.js";
export type { TemplateDisplayOptions } from "./layout/TemplateDisplay.js";

// Public version-registry error and selection types.
export { TemplateVersionError } from "@mailforge/templates";
export type {
    TemplateVersionInfo,
    TemplateVersionSelection,
    TemplateVersionStatus,
} from "@mailforge/templates";

// Template variant registry, connected to render().
export {
    TemplateVariantRegistry,
    TemplateVariantError,
} from "./registry/TemplateVariantRegistry.js";
export type {
    TemplateVariantDefinition,
    ResolvedTemplateVariant,
} from "./registry/TemplateVariantRegistry.js";

// Category-specific data contracts for business catalog templates.
export {
    accountCatalogTemplateDataSchema,
    authenticationCatalogTemplateDataSchema,
} from "@mailforge/templates";
export type {
    AccountCatalogTemplateData,
    AuthenticationCatalogTemplateData,
} from "@mailforge/templates";

// Billing and ecommerce catalog data contracts.
export {
    billingCatalogTemplateDataSchema,
    ecommerceCatalogTemplateDataSchema,
} from "@mailforge/templates";
export type {
    BillingCatalogTemplateData,
    EcommerceCatalogTemplateData,
} from "@mailforge/templates";

// Marketing and notification catalog data contracts.
export {
    marketingCatalogTemplateDataSchema,
    notificationCatalogTemplateDataSchema,
} from "@mailforge/templates";
export type {
    MarketingCatalogTemplateData,
    NotificationCatalogTemplateData,
} from "@mailforge/templates";

// Events, SaaS and support catalog data contracts.
export {
    eventCatalogTemplateDataSchema,
    saasCatalogTemplateDataSchema,
    supportCatalogTemplateDataSchema,
} from "@mailforge/templates";
export type {
    EventCatalogTemplateData,
    SaasCatalogTemplateData,
    SupportCatalogTemplateData,
} from "@mailforge/templates";

export { auditTemplateCatalog } from "@mailforge/templates";
export type { CatalogAudit, CatalogIssue } from "@mailforge/templates";
export { generatePreviewFixtures } from "./preview/CatalogPreview.js";
export type { TemplatePreviewFixture } from "./preview/CatalogPreview.js";

// Trusted application plugins.
export { PluginRegistry, MailForgePluginError } from "@mailforge/plugin-sdk";
export type { MailForgePlugin, MailForgePluginHost } from "@mailforge/plugin-sdk";
// Standalone registered theme definitions and immutable theme versions.
export { ThemeRegistry, ThemeVersionRegistry } from "@mailforge/themes";
export type { ThemeDefinition, ThemeImportOptions, ThemeVersionInfo } from "@mailforge/themes";

// Localization, translations and Intl formatters.
export {
    EmailLocalizationError, EmailLocalizationRegistry,
    normalizeEmailLocale, resolveEmailDirection,
    localizeEmailDocument, formatEmailDate,
    formatEmailCurrency, formatEmailNumber,
} from "./localization/EmailLocalization.js";
export type {
    EmailTranslation, EmailLocalizationOptions,
} from "./localization/EmailLocalization.js";
