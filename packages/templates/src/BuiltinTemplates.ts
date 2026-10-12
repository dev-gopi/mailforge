/**
 * Backward-compatible entry point.
 *
 * The actual template implementations now
 * live in their domain folders.
 */
export {
  getBuiltinTemplate,
  listBuiltinTemplates,
} from "./registry/TemplateCatalog.js";