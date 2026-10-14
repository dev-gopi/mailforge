import { describe, expect, it } from "vitest";
import { DocumentValidator } from "@mailforge/core";
import {
  BUILTIN_CATALOG_TEMPLATE_NAMES,
  getBuiltinCatalogTemplate,
  listBuiltinTemplateCatalog,
} from "../src/index.js";

describe("unified built-in template catalog", () => {
  it("includes every ready-to-use template in one catalog", () => {
    expect(BUILTIN_CATALOG_TEMPLATE_NAMES).toHaveLength(101);
    expect(listBuiltinTemplateCatalog()).toHaveLength(101);
  });

  it("builds valid documents from the catalog", () => {
    const validator = new DocumentValidator();
    for (const template of listBuiltinTemplateCatalog()) {
      expect(validator.validate(getBuiltinCatalogTemplate(template.id)).valid).toBe(true);
    }
  });
});
