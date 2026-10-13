import { describe, expect, it } from "vitest";
import { ComponentRegistry } from "@mailforge/core";
import { ComponentCatalog } from "../src/registry/ComponentCatalog.js";
import { BUSINESS_COMPONENT_NAMES, registerBusinessComponents, getBusinessComponentDefinitions } from "../src/business/BusinessComponents.js";

describe("Task 8.5.13: business catalog", () => {
    it("exports exactly 16 distinct definitions", () => {
        expect(getBusinessComponentDefinitions().map(d=>d.name)).toEqual([...BUSINESS_COMPONENT_NAMES]);
        expect(new Set(BUSINESS_COMPONENT_NAMES).size).toBe(16);
    });
    it("registers all definitions and refuses duplicates", () => {
        const catalog = new ComponentCatalog(new ComponentRegistry());
        registerBusinessComponents(catalog);
        for (const name of BUSINESS_COMPONENT_NAMES) expect(catalog.has(name)).toBe(true);
        expect(()=>registerBusinessComponents(catalog)).toThrow();
    });
    it("rejects invalid table data through catalog validation", () => {
        const catalog = new ComponentCatalog(new ComponentRegistry());
        registerBusinessComponents(catalog);
        expect(()=>catalog.resolveProps("mf-data-table",{headers:["A","B"],rows:[["x"]]})).toThrow();
    });
});
