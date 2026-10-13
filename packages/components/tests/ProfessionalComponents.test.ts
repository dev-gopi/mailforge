import { describe, it, expect } from "vitest";
import { getProfessionalComponentDefinitions, PROFESSIONAL_COMPONENT_NAMES } from "../src/professional/ProfessionalComponents.js";

const ctx = { nodeId: "sample", componentName: "professional" };
describe("Stage 8 professional components", () => {
    it("offers four distinct reusable components", () => {
        expect(getProfessionalComponentDefinitions().map(d => d.name)).toEqual([...PROFESSIONAL_COMPONENT_NAMES]);
    });
    it("builds a theme-aware hero with validated HTTP action", () => {
        const item = getProfessionalComponentDefinitions()[0]!;
        const output = item.render({ title: "Welcome", description: "Hello", actionText: "Open", actionUrl: "https://example.com" }, ctx);
        expect(JSON.stringify(output)).toContain("primary-action");
        expect(() => item.render({ title: "Welcome", description: "Hello", actionText: "Open", actionUrl: "javascript:alert(1)" }, ctx)).toThrow();
    });
    it("rejects nonexistent progress positions", () => {
        const item = getProfessionalComponentDefinitions()[2]!;
        expect(() => item.render({ steps: [{ label: "Packed" }], currentStep: 2 }, ctx)).toThrow();
    });
    it("renders a signature without requiring optional details", () => {
        const item = getProfessionalComponentDefinitions()[3]!;
        expect(JSON.stringify(item.render({ name: "Gopi", organization: "Northstar" }, ctx))).toContain("Northstar");
    });
});
