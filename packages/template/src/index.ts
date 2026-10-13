
// Existing public API
export {
  getBuiltinTemplate,
  listBuiltinTemplates,
  BUILTIN_CATALOG_TEMPLATE_NAMES,
  listBuiltinTemplateCatalog,
  getBuiltinCatalogTemplate,
} from "./BuiltinTemplates.js";

export type {
  BuiltinCatalogTemplateName,
  BuiltinCatalogTemplateInfo,
} from "./BuiltinTemplates.js";

export {
  BUILTIN_TEMPLATE_NAMES,
  isBuiltinTemplateName,
  assertBuiltinTemplateData,
  BuiltinTemplateDataError,
} from "./TemplateData.js";

export type {
  BuiltinTemplateName,
  BuiltinTemplateDataMap,
} from "./TemplateData.js";

// New domain catalog API
export {
  listTemplateCatalog,
  getBuiltinTemplateInfo,
} from "./registry/TemplateCatalog.js";

export type {
  TemplateCategory,
  TemplateCatalogEntry,
} from "./registry/TemplateCatalog.js";

export {
  DOMAIN_TEMPLATE_NAMES,
  DOMAIN_TEMPLATE_SCHEMAS,
  BUILTIN_ADDITIONAL_TEMPLATE_SCHEMAS,
  assertPlainTemplateData,
} from "./DomainTemplateData.js";

export type {
  DomainTemplateName,
  DomainTemplateDataMap,
  ParsedDomainTemplateDataMap,
  BuiltinAdditionalTemplateDataMap,
} from "./DomainTemplateData.js";

export {
  parseDomainTemplateData,
} from "./TemplateData.js";

export {
  buildDomainTemplate,
} from "./registry/DomainTemplateBuilder.js";

export {
  LEGACY_TEMPLATE_SCHEMAS,
} from "./contracts/LegacyTemplateSchemas.js";

export {
  TemplateContractRegistry,
} from "./registry/TemplateContractRegistry.js";

export type {
  TemplateFieldType,
  TemplateContractField,
  TemplateContractDefinition,
} from "./contracts/TemplateContract.types.js";

export {
  buildParsedDomainTemplate,
} from "./registry/DomainTemplateBuilder.js";

export type {
  ValidatedBuiltinTemplateDataMap,
} from "./registry/TemplateContractRegistry.js";
// Task 7.8.3.1: Template version lifecycle
export {
  TemplateVersionRegistry,
  TemplateVersionError,
} from "./registry/TemplateVersionRegistry.js";

export type {
  TemplateVersionInfo,
  TemplateVersionSelection,
  TemplateVersionStatus,
} from "./registry/TemplateVersionRegistry.js";

// Individually configurable built-in templates
export {
  buildNewsletterTemplate,
  newsletterSchema,
} from "./marketing/NewsletterTemplate.js";

export type {
  NewsletterData,
} from "./marketing/NewsletterTemplate.js";

export {
  buildPromotionTemplate,
  promotionSchema,
} from "./marketing/PromotionTemplate.js";

export type {
  PromotionData,
} from "./marketing/PromotionTemplate.js";

export {
  buildShippingUpdateTemplate,
  shippingUpdateSchema,
} from "./ecommerce/ShippingUpdateTemplate.js";

export type {
  ShippingUpdateData,
} from "./ecommerce/ShippingUpdateTemplate.js";

export {
  buildFeatureShowcaseTemplate,
  featureShowcaseSchema,
} from "./specialized/FeatureShowcaseTemplate.js";

export type {
  FeatureShowcaseData,
} from "./specialized/FeatureShowcaseTemplate.js";


// Complete catalog exports (kept under the existing singular template package).
export {
  CATALOG_TEMPLATE_DEFINITIONS,
  catalogTemplateDataSchema,
  listCatalogTemplates,
  isCatalogTemplateName,
  buildCatalogTemplate,
} from "./catalog/CatalogTemplates.js";
export type {
  CatalogTemplateName,
  CatalogTemplateCategory,
  CatalogTemplateInfo,
  CatalogTemplateData,
} from "./catalog/CatalogTemplates.js";

// Existing @mailforge/email API uses these older "extended" names.
// Alias the actual specialized definitions rather than duplicating them.
export {
  SPECIALIZED_TEMPLATE_NAMES,
  SPECIALIZED_TEMPLATE_NAMES as EXTENDED_TEMPLATE_NAMES,
  listSpecializedTemplates,
  listSpecializedTemplates as listExtendedTemplates,
  getSpecializedTemplateInfo,
  getSpecializedTemplateInfo as getExtendedTemplateInfo,
  getSpecializedTemplate,
  getSpecializedTemplate as getExtendedTemplate,
  registerSpecializedTemplates,
  registerSpecializedTemplates as registerExtendedTemplates,
} from "./specialized/SpecializedTemplates.js";
export type {
  SpecializedTemplateName,
  SpecializedTemplateDataMap,
  SpecializedTemplateInfo,
  SpecializedTemplateName as ExtendedTemplateName,
  SpecializedTemplateDataMap as ExtendedTemplateDataMap,
  SpecializedTemplateInfo as ExtendedTemplateInfo,
} from "./specialized/SpecializedTemplates.js";
