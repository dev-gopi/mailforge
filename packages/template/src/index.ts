
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
