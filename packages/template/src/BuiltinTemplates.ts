import type { EmailDocument } from "@mailforge/core";
import { getBuiltinTemplate as getCoreBuiltinTemplate, listBuiltinTemplates as listCoreBuiltinTemplates } from "./registry/TemplateCatalog.js";
import { buildCatalogTemplate, isCatalogTemplateName, listCatalogTemplates, type CatalogTemplateName } from "./catalog/CatalogTemplates.js";
import { getSpecializedTemplate, listSpecializedTemplates, type SpecializedTemplateName } from "./specialized/SpecializedTemplates.js";
import type { BuiltinTemplateName as CoreBuiltinTemplateName } from "./TemplateData.js";

/** One public catalog for every ready-to-use MailForge template. */
export const BUILTIN_CATALOG_TEMPLATE_NAMES = [
  ...listCoreBuiltinTemplates(),
  ...listSpecializedTemplates().map(template => template.id),
  ...listCatalogTemplates().map(template => template.id),
] as const;

export type BuiltinCatalogTemplateName = CoreBuiltinTemplateName | SpecializedTemplateName | CatalogTemplateName;
export interface BuiltinCatalogTemplateInfo {
  readonly id: BuiltinCatalogTemplateName;
  readonly category: string;
  readonly title: string;
  readonly description: string;
  readonly version: string;
}

/** The original ten built-ins, retained for callers that rely on this API. */
export function listBuiltinTemplates(): CoreBuiltinTemplateName[] {
  return listCoreBuiltinTemplates();
}

export function listBuiltinTemplateCatalog(): BuiltinCatalogTemplateInfo[] {
  const core = listCoreBuiltinTemplates().map(id => ({
    id, category: "core", title: id, description: "Built-in email template", version: "1.0.0",
  }));
  return [...core, ...listSpecializedTemplates(), ...listCatalogTemplates()];
}

/** Build one of the original ten built-ins. */
export function getBuiltinTemplate(name: CoreBuiltinTemplateName): EmailDocument {
  return getCoreBuiltinTemplate(name);
}

/** Build any template in the unified built-in catalog. */
export function getBuiltinCatalogTemplate(name: BuiltinCatalogTemplateName): EmailDocument {
  if (isCatalogTemplateName(name)) return buildCatalogTemplate(name);
  if ((listSpecializedTemplates().map(template => template.id) as string[]).includes(name)) {
    return getSpecializedTemplate(name as SpecializedTemplateName);
  }
  return getBuiltinTemplate(name as CoreBuiltinTemplateName);
}
