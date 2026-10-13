# Public API reference

> Runtime exports below come from built packages. Source TypeScript types are available in
> their respective `src/index.ts` files and generated `dist/index.d.ts` declarations.

## Quick start

```ts
import { createEmail } from "@mailforge/email";
const engine = createEmail({ brand: { name: "Example", supportEmail: "support@example.com" } });
const result = await engine.render("welcome", { data: {
  user: { firstName: "Sam" },
  actionUrl: "https://example.com/dashboard",
} });
console.log(result.html, result.text);
```

## Package exports (runtime)

### `@mailforge/email`

- `BuiltinTemplateDataError`
- `COMPOSITE_COMPONENT_NAMES`
- `ComponentCatalog`
- `ComponentCatalogError`
- `ComponentExpander`
- `ComponentRenderError`
- `DOMAIN_TEMPLATE_NAMES`
- `EXTENDED_COMPONENT_NAMES`
- `EXTENDED_TEMPLATE_NAMES`
- `EmailConfigError`
- `EmailLayoutError`
- `EmailLayoutPresetError`
- `EmailLocalizationError`
- `EmailLocalizationRegistry`
- `EmailRenderBudgetError`
- `EmailThemeError`
- `EmailVariableError`
- `MailForgeEmail`
- `MailForgePluginError`
- `PluginRegistry`
- `STANDARD_COMPONENT_NAMES`
- `TemplateContractRegistry`
- `TemplateDisplayError`
- `TemplatePresetError`
- `TemplatePresetRegistry`
- `TemplateVariantError`
- `TemplateVariantRegistry`
- `TemplateVersionError`
- `ThemeProfileRegistry`
- `ThemeRegistry`
- `ThemeVersionRegistry`
- `accountCatalogTemplateDataSchema`
- `applyDefaultLayout`
- `applyEmailTheme`
- `applyTemplateDisplay`
- `assertBuiltinTemplateData`
- `assertRenderBudget`
- `auditTemplateCatalog`
- `authenticationCatalogTemplateDataSchema`
- `billingCatalogTemplateDataSchema`
- `buildDomainTemplate`
- `buildFeatureShowcaseTemplate`
- `buildNewsletterTemplate`
- `buildPromotionTemplate`
- `buildShippingUpdateTemplate`
- `createCalloutBoxDefinition`
- `createDividerWithTextDefinition`
- `createEmail`
- `createKeyValueListDefinition`
- `createSocialLinksDefinition`
- `defineThemeOverrides`
- `ecommerceCatalogTemplateDataSchema`
- `eventCatalogTemplateDataSchema`
- `featureShowcaseSchema`
- `formatEmailCurrency`
- `formatEmailDate`
- `formatEmailNumber`
- `generatePreviewFixtures`
- `getBuiltinTemplate`
- `getCompositeComponentDefinitions`
- `getExtendedComponentDefinitions`
- `getExtendedTemplate`
- `getExtendedTemplateInfo`
- `getLayoutPreset`
- `getStandardComponentDefinitions`
- `getThemePreset`
- `interpolateDocumentPatches`
- `interpolateEmailDocument`
- `isBuiltinTemplateName`
- `listBuiltinTemplates`
- `listExtendedTemplates`
- `listLayoutPresets`
- `listThemePresets`
- `localizeEmailDocument`
- `marketingCatalogTemplateDataSchema`
- `mergeEmailLayout`
- `mergeEmailTheme`
- `normalizeEmailLocale`
- `notificationCatalogTemplateDataSchema`
- `parseDomainTemplateData`
- `prepareTemplateForValidation`
- `registerAllComponents`
- `registerExtendedComponents`
- `registerExtendedTemplates`
- `resolveEmailConfig`
- `resolveEmailDirection`
- `resolveEmailLayout`
- `resolveEmailTheme`
- `saasCatalogTemplateDataSchema`
- `supportCatalogTemplateDataSchema`

### `@mailforge/templates`

- `BUILTIN_ADDITIONAL_TEMPLATE_SCHEMAS`
- `BUILTIN_CATALOG_TEMPLATE_NAMES`
- `BUILTIN_TEMPLATE_NAMES`
- `BuiltinTemplateDataError`
- `CATALOG_DESIGN_FAMILIES`
- `CATALOG_TEMPLATE_DEFINITIONS`
- `DOMAIN_TEMPLATE_NAMES`
- `DOMAIN_TEMPLATE_SCHEMAS`
- `EXPANDED_CATALOG_TEMPLATE_DEFINITIONS`
- `EXPANDED_CATALOG_TEMPLATE_NAMES`
- `EXPANDED_TEMPLATE_STORIES`
- `EXTENDED_TEMPLATE_NAMES`
- `LEGACY_TEMPLATE_SCHEMAS`
- `SPECIALIZED_TEMPLATE_NAMES`
- `TemplateContractRegistry`
- `TemplateVersionError`
- `TemplateVersionRegistry`
- `accountCatalogTemplateDataSchema`
- `assertBuiltinTemplateData`
- `assertPlainTemplateData`
- `auditTemplateCatalog`
- `authenticationCatalogTemplateDataSchema`
- `billingCatalogTemplateDataSchema`
- `buildCatalogTemplate`
- `buildDomainTemplate`
- `buildFeatureShowcaseTemplate`
- `buildNewsletterTemplate`
- `buildParsedDomainTemplate`
- `buildPromotionTemplate`
- `buildShippingUpdateTemplate`
- `catalogTemplateDataSchema`
- `ecommerceCatalogTemplateDataSchema`
- `eventCatalogTemplateDataSchema`
- `expandedTemplatePresentationSchema`
- `featureShowcaseSchema`
- `getBuiltinCatalogTemplate`
- `getBuiltinTemplate`
- `getBuiltinTemplateInfo`
- `getCatalogDesignFamily`
- `getExtendedTemplate`
- `getExtendedTemplateInfo`
- `getSpecializedTemplate`
- `getSpecializedTemplateInfo`
- `isBuiltinTemplateName`
- `isCatalogTemplateName`
- `isExpandedCatalogTemplateName`
- `listBuiltinTemplateCatalog`
- `listBuiltinTemplates`
- `listCatalogTemplates`
- `listExtendedTemplates`
- `listSpecializedTemplates`
- `listTemplateCatalog`
- `marketingCatalogTemplateDataSchema`
- `newsletterSchema`
- `notificationCatalogTemplateDataSchema`
- `parseDomainTemplateData`
- `promotionSchema`
- `registerExtendedTemplates`
- `registerSpecializedTemplates`
- `saasCatalogTemplateDataSchema`
- `shippingUpdateSchema`
- `supportCatalogTemplateDataSchema`

### `@mailforge/themes`

- `EmailThemeError`
- `THEME_PRESET_NAMES`
- `ThemeRegistry`
- `ThemeVersionRegistry`
- `auditThemeContrast`
- `defineThemeOverrides`
- `getContrastRatio`
- `getThemePreset`
- `listThemeCatalog`
- `listThemePresets`
- `mergeEmailTheme`
- `resolveEmailTheme`

### `@mailforge/components`

- `BUSINESS_COMPONENT_NAMES`
- `COMPOSITE_COMPONENT_NAMES`
- `ComponentCatalog`
- `ComponentCatalogError`
- `ComponentExpander`
- `ComponentRenderError`
- `EXTENDED_COMPONENT_NAMES`
- `PROFESSIONAL_COMPONENT_NAMES`
- `STANDARD_COMPONENT_NAMES`
- `calculateOrderTotal`
- `centsSchema`
- `createActionButtonDefinition`
- `createBrandLogoDefinition`
- `createButtonGroupDefinition`
- `createCalloutBoxDefinition`
- `createCompanySignatureDefinition`
- `createContentCardDefinition`
- `createDividerWithTextDefinition`
- `createHeroSectionDefinition`
- `createImageCaptionDefinition`
- `createKeyValueListDefinition`
- `createOrderItemDefinition`
- `createOrderSummaryDefinition`
- `createOtpCodeDefinition`
- `createPriceSummaryDefinition`
- `createProgressTimelineDefinition`
- `createSecurityNoticeDefinition`
- `createSocialLinksDefinition`
- `createStatisticBlockDefinition`
- `createStatusBadgeDefinition`
- `createTwoColumnLayoutDefinition`
- `currencySchema`
- `formatMoney`
- `getBusinessComponentDefinitions`
- `getCompositeComponentDefinitions`
- `getExtendedComponentDefinitions`
- `getProfessionalComponentDefinitions`
- `getStandardComponentDefinitions`
- `orderItemSchema`
- `registerAllComponents`
- `registerBusinessComponents`
- `registerCompositeComponents`
- `registerExtendedComponents`
- `registerProfessionalComponents`
- `registerStandardComponents`

## Important behavior

- Rendering and email delivery are separate; delivery is optional.
- Untrusted HTML and URLs must pass the existing sanitizers and validators.
- Keep `createEmail()` engines isolated per tenant when registering extensions.
- Built-in IDs, customizations, theme overrides, variants and versions are public compatibility commitments.
