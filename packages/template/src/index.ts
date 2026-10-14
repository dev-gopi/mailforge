
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
// Template version lifecycle
export {
  TemplateVersionRegistry,
  TemplateVersionError,
} from "./registry/TemplateVersionRegistry.js";

export type {
  TemplateVersionInfo,
  TemplateVersionSelection,
  TemplateVersionStatus,
} from "./registry/TemplateVersionRegistry.js";

export {
  buildWorkspaceInvitationEditorialTemplate,
  workspaceInvitationEditorialSchema,
  workspaceInvitationEditorialPreviewData,
} from "./account/WorkspaceInvitationTemplate.js";
export type { WorkspaceInvitationEditorialData } from "./account/WorkspaceInvitationTemplate.js";

export {
  buildAppointmentConfirmationTemplate,
  appointmentConfirmationSchema,
  appointmentConfirmationPreviewData,
} from "./events/AppointmentConfirmationTemplate.js";
export type { AppointmentConfirmationData } from "./events/AppointmentConfirmationTemplate.js";

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


export { buildReportReadyTemplate, reportReadySchema, reportReadyPreviewData } from "./notifications/ReportReadyTemplate.js";
export type { ReportReadyData } from "./notifications/ReportReadyTemplate.js";
export { buildActivityNotificationTemplate, activityNotificationSchema, activityNotificationPreviewData } from "./notifications/ActivityNotificationTemplate.js";
export type { ActivityNotificationData } from "./notifications/ActivityNotificationTemplate.js";
export { buildPasswordResetSecureTemplate, passwordResetSecureSchema, passwordResetSecurePreviewData } from "./authentication/PasswordResetSecureTemplate.js";
export type { PasswordResetSecureData } from "./authentication/PasswordResetSecureTemplate.js";
export { buildNewDeviceLoginAlertTemplate, newDeviceLoginAlertSchema, newDeviceLoginAlertPreviewData } from "./authentication/NewDeviceLoginAlertTemplate.js";
export type { NewDeviceLoginAlertData } from "./authentication/NewDeviceLoginAlertTemplate.js";

export { buildOrderShippedTemplate, orderShippedSchema, orderShippedPreviewData } from "./ecommerce/OrderShippedTemplate.js";
export type { OrderShippedData } from "./ecommerce/OrderShippedTemplate.js";
export { buildProgressSteps } from "./shared/ProgressSteps.js";
export type { ProgressStepsOptions } from "./shared/ProgressSteps.js";

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

// Category-specific catalog data contracts.
export {
    accountCatalogTemplateDataSchema,
    authenticationCatalogTemplateDataSchema,
} from "./catalog/CatalogTemplates.js";
export type {
    AccountCatalogTemplateData,
    AuthenticationCatalogTemplateData,
} from "./catalog/CatalogTemplates.js";

// Billing and ecommerce catalog data contracts.
export {
    billingCatalogTemplateDataSchema,
    ecommerceCatalogTemplateDataSchema,
} from "./catalog/CatalogTemplates.js";
export type {
    BillingCatalogTemplateData,
    EcommerceCatalogTemplateData,
} from "./catalog/CatalogTemplates.js";

// Marketing and notification catalog data contracts.
export {
    marketingCatalogTemplateDataSchema,
    notificationCatalogTemplateDataSchema,
} from "./catalog/CatalogTemplates.js";
export type {
    MarketingCatalogTemplateData,
    NotificationCatalogTemplateData,
} from "./catalog/CatalogTemplates.js";

// Events, SaaS and support catalog data contracts.
export {
    eventCatalogTemplateDataSchema,
    saasCatalogTemplateDataSchema,
    supportCatalogTemplateDataSchema,
} from "./catalog/CatalogTemplates.js";
export type {
    EventCatalogTemplateData,
    SaasCatalogTemplateData,
    SupportCatalogTemplateData,
} from "./catalog/CatalogTemplates.js";

export { auditTemplateCatalog } from "./registry/TemplateCatalogAudit.js";
export type { CatalogAudit, CatalogIssue } from "./registry/TemplateCatalogAudit.js";

// Additional typed catalog templates.
export {
    EXPANDED_CATALOG_TEMPLATE_NAMES,
    EXPANDED_CATALOG_TEMPLATE_DEFINITIONS,
    EXPANDED_TEMPLATE_STORIES,
    isExpandedCatalogTemplateName,
    expandedTemplatePresentationSchema,
} from "./catalog/ExpandedCatalogTemplates.js";
export type {
    ExpandedCatalogTemplateName,
    ExpandedTemplatePresentation,
    ExpandedTemplateStory,
} from "./catalog/ExpandedCatalogTemplates.js";

// Discoverable visual composition families for built-in catalog emails.
export { CATALOG_DESIGN_FAMILIES, getCatalogDesignFamily } from "./catalog/CatalogDesignFamilies.js";
export type { CatalogDesignFamily } from "./catalog/CatalogDesignFamilies.js";
