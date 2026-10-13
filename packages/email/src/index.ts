export {
    createEmail,
    MailForgeEmail,
} from "./createEmail.js";

export type {
    TemplateRenderOptions,
} from "./createEmail.js";

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
    ThemeAppearance,
    ThemeOverrides,
    ThemeConfiguration,
    EmailThemeOptions,
    ResolvedEmailTheme,
} from "./theme/Theme.types.js";

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

// Task 7.8.2.2: template presets and reusable theme profiles
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

// Task 7.8.3.2: Public version registry error and selection types.
export { TemplateVersionError } from "@mailforge/templates";
export type {
    TemplateVersionInfo,
    TemplateVersionSelection,
    TemplateVersionStatus,
} from "@mailforge/templates";

// Task 7.8.4: existing template variant registry, now connected to render().
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
