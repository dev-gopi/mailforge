
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
