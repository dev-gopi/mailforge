
// Existing public API
export {
  getBuiltinTemplate,
  listBuiltinTemplates,
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
  assertPlainTemplateData,
} from "./DomainTemplateData.js";

export type {
  DomainTemplateName,
  DomainTemplateDataMap,
  ParsedDomainTemplateDataMap,
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

// Extended domain templates
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
  EXTENDED_TEMPLATE_NAMES,
  EXTENDED_TEMPLATE_SCHEMAS,
  listExtendedTemplates,
  getExtendedTemplateInfo,
  getExtendedTemplate,
  registerExtendedTemplates,
} from "./extended/ExtendedTemplates.js";

export type {
  ExtendedTemplateName,
  ExtendedTemplateDataMap,
  ExtendedTemplateInfo,
} from "./extended/ExtendedTemplates.js";

export {
  buildFeatureShowcaseTemplate,
  featureShowcaseSchema,
} from "./extended/FeatureShowcaseTemplate.js";

export type {
  FeatureShowcaseData,
} from "./extended/FeatureShowcaseTemplate.js";

